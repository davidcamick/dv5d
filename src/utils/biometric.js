// Add these encryption utility functions at the top
async function encryptForStorage(data, key) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    derivedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(data)
  );

  return {
    encrypted: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
    salt: Array.from(salt)
  };
}

async function decryptFromStorage(encryptedData, key) {
  const decoder = new TextDecoder();
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(encryptedData.salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    derivedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
    aesKey,
    new Uint8Array(encryptedData.encrypted)
  );

  return decoder.decode(decrypted);
}

export async function registerBiometric(masterPassword) {
  try {
    const publicKeyCredentialCreationOptions = {
      challenge: new Uint8Array(32),
      rp: {
        name: "DV5D Password Manager",
        id: window.location.hostname
      },
      user: {
        id: new Uint8Array(16),
        name: "user@example.com",
        displayName: "DV5D User"
      },
      pubKeyCredParams: [{
        type: "public-key",
        alg: -7
      }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      }
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    // Store encrypted master password with credential ID
    const credentialId = Array.from(new Uint8Array(credential.rawId));
    const encryptedData = await encryptForStorage(
      masterPassword,
      credentialId.join(',')
    );
    
    localStorage.setItem('biometricData', JSON.stringify({
      credentialId,
      encryptedData
    }));

    return true;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    throw error;
  }
}

export async function verifyBiometric() {
  try {
    const storedData = JSON.parse(localStorage.getItem('biometricData'));
    if (!storedData) throw new Error('No biometric data found');

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        rpId: window.location.hostname,
        allowCredentials: [{
          id: new Uint8Array(storedData.credentialId),
          type: 'public-key'
        }],
        userVerification: "required"
      }
    });

    if (credential) {
      // Decrypt and return master password
      return decryptFromStorage(
        storedData.encryptedData,
        storedData.credentialId.join(',')
      );
    }
  } catch (error) {
    console.error('Biometric verification failed:', error);
    throw error;
  }
}
