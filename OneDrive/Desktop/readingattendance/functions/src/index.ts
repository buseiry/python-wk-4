import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { startSessionV2, verifySession as verifySessionScheduled, paystackWebhookV2 } from './sessionV2';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Paystack configuration
const PAYSTACK_SECRET_KEY = functions.config().paystack?.secret_key || 'sk_test_your_secret_key';
// const PAYSTACK_PUBLIC_KEY = functions.config().paystack?.public_key || 'pk_test_your_public_key';

/**
 * Start a new reading session
 */
export const startSession = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { userId: requestUserId } = data;

    // Verify user owns the request
    if (userId !== requestUserId) {
      throw new functions.https.HttpsError('permission-denied', 'User can only start their own sessions');
    }

    // Check if user has an active session
    const activeSessionQuery = await db
      .collection('sessions')
      .where('userId', '==', userId)
      .where('completed', '==', false)
      .get();

    if (!activeSessionQuery.empty) {
      throw new functions.https.HttpsError('already-exists', 'User already has an active session');
    }

    // Check if user has paid (except for first user)
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    if (!userData?.paymentStatus) {
      throw new functions.https.HttpsError('permission-denied', 'Payment required to start sessions');
    }

    // Create new session with server timestamp
    const sessionData = {
      userId: userId,
      startAt: admin.firestore.FieldValue.serverTimestamp(),
      completed: false,
      pointsAwarded: false,
      disconnected: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const sessionRef = await db.collection('sessions').add(sessionData);

    // Schedule session completion check
    await scheduleSessionCompletion(sessionRef.id);

    return {
      success: true,
      session: {
        id: sessionRef.id,
        ...sessionData,
        startAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error starting session:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to start session');
  }
});

/**
 * Complete a reading session and award points
 */
export const completeSession = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { sessionId } = data;

    // Get session data
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const sessionData = sessionDoc.data();
    
    // Verify session belongs to user
    if (sessionData?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'User can only complete their own sessions');
    }

    // Check if session is already completed
    if (sessionData?.completed) {
      throw new functions.https.HttpsError('already-exists', 'Session already completed');
    }

    // Check if session has been running for at least 60 minutes
    const startTime = sessionData?.startAt?.toDate();
    const now = new Date();
    const duration = now.getTime() - startTime.getTime();
    const durationMinutes = duration / (1000 * 60);

    if (durationMinutes < 60) {
      throw new functions.https.HttpsError('failed-precondition', 'Session must run for at least 60 minutes');
    }

    // Check if user was disconnected
    if (sessionData?.disconnected) {
      throw new functions.https.HttpsError('failed-precondition', 'Session was disconnected before completion');
    }

    // Use transaction to atomically complete session and award points
    const result = await db.runTransaction(async (transaction) => {
      // Get current user data
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const userData = userDoc.data();
      
      // Update session
      const sessionRef = db.collection('sessions').doc(sessionId);
      transaction.update(sessionRef, {
        completed: true,
        endAt: admin.firestore.FieldValue.serverTimestamp(),
        durationMinutes: Math.floor(durationMinutes),
        pointsAwarded: true
      });

      // Award point to user
      transaction.update(userRef, {
        points: admin.firestore.FieldValue.increment(1),
        lastSessionCompleted: admin.firestore.FieldValue.serverTimestamp(),
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        points: (userData?.points || 0) + 1,
        durationMinutes: Math.floor(durationMinutes)
      };
    });

    return {
      success: true,
      points: result.points,
      durationMinutes: result.durationMinutes
    };
  } catch (error) {
    console.error('Error completing session:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to complete session');
  }
});

/**
 * Create payment reference for Paystack
 */
export const createPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { email, amount } = data;

    // Generate unique reference
    const reference = `reading_tracker_${userId}_${Date.now()}`;

    // Create payment record
    await db.collection('payments').doc(reference).set({
      userId: userId,
      email: email,
      amount: amount,
      currency: 'NGN',
      reference: reference,
      status: 'pending',
      provider: 'paystack',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      reference: reference
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment');
  }
});

/**
 * Verify payment with Paystack
 */
export const verifyPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { reference } = data;

    // Get payment record
    const paymentDoc = await db.collection('payments').doc(reference).get();
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Payment not found');
    }

    const paymentData = paymentDoc.data();
    if (paymentData?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Payment does not belong to user');
    }

    // Verify with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const paystackData = response.data.data;

    if (paystackData.status === 'success') {
      // Update payment record
      await db.collection('payments').doc(reference).update({
        status: 'success',
        paystackReference: paystackData.reference,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        amountPaid: paystackData.amount,
        currency: paystackData.currency
      });

      // Update user payment status
      await db.collection('users').doc(userId).update({
        paymentStatus: true,
        paymentReference: reference,
        paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        amount: paystackData.amount,
        currency: paystackData.currency
      };
    } else {
      throw new functions.https.HttpsError('failed-precondition', 'Payment verification failed');
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to verify payment');
  }
});

/**
 * Paystack webhook handler
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // const signature = req.headers['x-paystack-signature'];
    // const body = JSON.stringify(req.body);

    // Verify webhook signature (implement proper verification)
    // For now, we'll trust the webhook
    
    const event = req.body;
    
    if (event.event === 'charge.success') {
      const { reference } = event.data;
      
      // Update payment record
      await db.collection('payments').doc(reference).update({
        status: 'success',
        webhookVerified: true,
        webhookVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Get payment data to update user
      const paymentDoc = await db.collection('payments').doc(reference).get();
      if (paymentDoc.exists) {
        const paymentData = paymentDoc.data();
        await db.collection('users').doc(paymentData?.userId).update({
          paymentStatus: true,
          paymentReference: reference,
          paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Error');
  }
});

/**
 * Schedule session completion check
 */
async function scheduleSessionCompletion(sessionId: string) {
  // In a production environment, you would use Cloud Scheduler
  // For now, we'll use a setTimeout approach
  setTimeout(async () => {
    try {
      const sessionDoc = await db.collection('sessions').doc(sessionId).get();
      if (!sessionDoc.exists) return;

      const sessionData = sessionDoc.data();
      if (sessionData?.completed) return;

      // Check if 60 minutes have passed
      const startTime = sessionData?.startAt?.toDate();
      const now = new Date();
      const duration = now.getTime() - startTime.getTime();
      const durationMinutes = duration / (1000 * 60);

      if (durationMinutes >= 60 && !sessionData?.disconnected) {
        // Auto-complete session
        await db.collection('sessions').doc(sessionId).update({
          completed: true,
          endAt: admin.firestore.FieldValue.serverTimestamp(),
          durationMinutes: Math.floor(durationMinutes),
          autoCompleted: true
        });

        // Award point
        await db.collection('users').doc(sessionData?.userId).update({
          points: admin.firestore.FieldValue.increment(1),
          lastSessionCompleted: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error in scheduled session completion:', error);
    }
  }, 60 * 60 * 1000); // 60 minutes
}

/**
 * Update user ranks periodically
 */
export const updateRanks = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  try {
    const usersSnapshot = await db.collection('users').orderBy('points', 'desc').get();
    
    let rank = 1;
    const batch = db.batch();
    
    usersSnapshot.forEach((doc) => {
      batch.update(doc.ref, { rank: rank++ });
    });
    
    await batch.commit();
    console.log('Updated ranks for all users');
  } catch (error) {
    console.error('Error updating ranks:', error);
  }
});

/**
 * Clean up old sessions
 */
export const cleanupOldSessions = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldSessionsQuery = await db
      .collection('sessions')
      .where('createdAt', '<', thirtyDaysAgo)
      .get();
    
    const batch = db.batch();
    oldSessionsQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleaned up ${oldSessionsQuery.docs.length} old sessions`);
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
});


/**
 * Verify session - HTTPS callable function
 */
export const verifySession = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      console.warn('verifySession: Unauthenticated request');
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { sessionId } = data;

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      console.warn(`verifySession: Invalid sessionId for user ${userId}`, { sessionId });
      throw new functions.https.HttpsError('invalid-argument', 'Valid sessionId is required');
    }

    console.log(`verifySession: Starting verification for user ${userId}, session ${sessionId}`);

    const db = admin.firestore();
    const sessionsRef = db.collection('sessions');
    const sessionDoc = await sessionsRef.doc(sessionId).get();

    if (!sessionDoc.exists) {
      console.warn(`verifySession: Session not found for user ${userId}`, { sessionId });
      return { 
        success: false, 
        message: 'Session not found',
        sessionId: sessionId 
      };
    }

    const sessionData = sessionDoc.data();
    
    // Verify session belongs to user
    if (sessionData?.userId !== userId) {
      console.warn(`verifySession: Session ownership mismatch for user ${userId}`, { 
        sessionId, 
        sessionUserId: sessionData?.userId 
      });
      throw new functions.https.HttpsError('permission-denied', 'Session does not belong to user');
    }

    // Log verification attempt
    await db.collection('session-logs').add({
      sessionId,
      userId,
      eventType: 'manual_verification',
      eventData: { 
        verifiedBy: 'user',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`verifySession: Successfully verified session ${sessionId} for user ${userId}`);

    return { 
      success: true, 
      session: {
        id: sessionId,
        ...sessionData,
        // Don't expose sensitive data
        userId: undefined
      },
      message: 'Session verified successfully'
    };

  } catch (error) {
    console.error('verifySession: Error during verification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Log error for monitoring
    try {
      const db = admin.firestore();
      await db.collection('error-logs').add({
        function: 'verifySession',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: context.auth?.uid,
        data: data,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logError) {
      console.error('verifySession: Failed to log error:', logError);
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to verify session');
  }
});

// v2 exports
export { startSessionV2, verifySessionScheduled as verifySessionV2, paystackWebhookV2 };
