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
    const encryptedMasterPass = await encryptForStorage(masterPassword, credential.id);
    localStorage.setItem('biometricData', JSON.stringify({
      credentialId: Array.from(new Uint8Array(credential.rawId)),
      encryptedMasterPass
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
      return decryptFromStorage(storedData.encryptedMasterPass);
    }
  } catch (error) {
    console.error('Biometric verification failed:', error);
    throw error;
  }
}
