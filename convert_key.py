import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

# Read the private key
with open('key.pem', 'rb') as f:
    private_key_data = f.read()

# Load the private key
from cryptography.hazmat.primitives.serialization import load_pem_private_key
private_key = load_pem_private_key(private_key_data, password=None, backend=default_backend())

# Get public key
public_key = private_key.public_key()

# Export in DER format
public_der = public_key.public_key_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Encode to base64
public_base64 = base64.b64encode(public_der).decode('utf-8')

print(public_base64)