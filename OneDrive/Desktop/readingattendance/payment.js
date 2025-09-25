// Payment Management Module
class PaymentManager {
    constructor() {
        this.db = window.firebaseDb;
        this.auth = window.firebaseAuth;
        this.functions = window.firebaseFunctions;
        this.pendingUser = null;
        this.setupEventListeners();
        this.loadPaystackScript();
    }

    setupEventListeners() {
        document.getElementById('paystack-pay-btn').addEventListener('click', () => this.initiatePayment());
        document.getElementById('back-to-register').addEventListener('click', () => this.backToRegister());
    }

    loadPaystackScript() {
        // Load Paystack script if not already loaded
        if (!document.querySelector('script[src*="paystack"]')) {
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v1/inline.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }

    async initiatePayment() {
        const user = window.authManager.getCurrentUser();
        if (!user) {
            this.showError('Please register first');
            return;
        }

        try {
            this.showLoading('Preparing payment...');

            // Call Cloud Function to create payment reference
            const createPayment = this.functions.httpsCallable('createPayment');
            const result = await createPayment({
                userId: user.uid,
                email: user.email,
                amount: 50000 // 500 Naira in kobo
            });

            if (result.data.success) {
                this.processPayment(result.data.reference, user.email);
            } else {
                this.showError(result.data.error || 'Failed to create payment');
            }
        } catch (error) {
            console.error('Error initiating payment:', error);
            this.showError('Failed to initiate payment. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    processPayment(reference, email) {
        const handler = PaystackPop.setup({
            key: 'pk_test_your_paystack_public_key', // Replace with your actual Paystack public key
            email: email,
            amount: 50000, // 500 Naira in kobo
            ref: reference,
            currency: 'NGN',
            metadata: {
                custom_fields: [
                    {
                        display_name: "Payment Method",
                        variable_name: "payment_method",
                        value: "Ecobank: 4890010148 (Buseiry Olayinka Habeeb) | OPay: 9164392514 (Buseiry Olayinka Habeeb)"
                    }
                ]
            },
            callback: (response) => {
                this.handlePaymentSuccess(response);
            },
            onClose: () => {
                this.handlePaymentCancelled();
            }
        });

        handler.openIframe();
    }

    async handlePaymentSuccess(response) {
        try {
            this.showLoading('Verifying payment...');

            // Call Cloud Function to verify payment
            const verifyPayment = this.functions.httpsCallable('verifyPayment');
            const result = await verifyPayment({
                reference: response.reference,
                userId: this.auth.currentUser.uid
            });

            if (result.data.success) {
                this.showMessage('Payment successful! Your account is now active.', 'success');
                
                // Update user payment status
                await this.db.collection('users').doc(this.auth.currentUser.uid).update({
                    paymentStatus: true,
                    paymentReference: response.reference,
                    paymentVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Redirect to dashboard
                setTimeout(() => {
                    this.showDashboard();
                }, 2000);
            } else {
                this.showError(result.data.error || 'Payment verification failed');
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            this.showError('Payment verification failed. Please contact support.');
        } finally {
            this.hideLoading();
        }
    }

    handlePaymentCancelled() {
        this.showMessage('Payment cancelled. You can try again anytime.', 'info');
    }

    backToRegister() {
        window.authManager.showRegisterForm();
    }

    showDashboard() {
        window.authManager.handleAuthenticatedUser();
    }

    showLoading(message = 'Loading...') {
        const loadingEl = document.getElementById('loading-screen');
        loadingEl.querySelector('p').textContent = message;
        loadingEl.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showMessage(message, type) {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    // Public methods
    setPendingUser(userData) {
        this.pendingUser = userData;
    }

    getPendingUser() {
        return this.pendingUser;
    }
}

// Initialize payment manager
window.paymentManager = new PaymentManager();
