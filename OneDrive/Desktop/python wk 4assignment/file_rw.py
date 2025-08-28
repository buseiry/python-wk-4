# Try to read the file
try:
    with open(src, "r", encoding="utf-8") as f:
        data = f.read()
except FileNotFoundError:
    print("Error: file not found.")
    return
except PermissionError:
    print("Error: no permission to read this file.")
    return
except IsADirectoryError:
    print("Error: the path is a directory, not a file.")
    return
except OSError as e:
    print(f"Error: cannot read the file. {e}")
    return

# Modify the content
modified = modify_content(data)

# Build output name: same name with .modified before the extension
import os
base, ext = os.path.splitext(src)
if ext == "":
    ext = ".txt"
out_path = f"{base}.modified{ext}"

# Try to write the modified content
try:
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(modified)
    print(f"Modified file saved as: {out_path}")
except PermissionError:
    print("Error: no permission to write the output file.")
except OSError as e:
    print(f"Error: cannot write the output file. {e}")
