import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuroraText } from '../components/ui/AuroraText';
import { AnimatedGridPattern } from '../components/ui/AnimatedGridPattern';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ClipboardIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import PasswordForm from '../components/password/PasswordForm';
import { encryptData, decryptData } from '../utils/encryption';

const WORKER_URL = 'https://passwords.your-worker.workers.dev';

export default function Passwords() {
  const [isLocked, setIsLocked] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [passwords, setPasswords] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Check for biometric availability
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricAvailable(available);
        }
      } catch (error) {
        console.error('Biometric check failed:', error);
      }
    };
    
    checkBiometric();
  }, []);

  const handleUnlock = async () => {
    try {
      const response = await fetch(WORKER_URL);
      const encryptedData = await response.json();
      
      const decrypted = await decryptData(encryptedData, masterPassword);
      setPasswords(decrypted);
      setIsLocked(false);
      
      // Store the master password in memory (not persistent)
      // It will be cleared when the page is refreshed
      sessionStorage.setItem('masterPassword', masterPassword);
    } catch (error) {
      setError('Invalid master password');
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      // Request biometric authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          rpId: window.location.hostname,
          userVerification: "required",
        }
      });

      if (credential) {
        // Retrieve the stored master password using the credential
        // This is a simplified example - you'd need to implement proper key management
        const storedPassword = await retrieveStoredMasterPassword(credential);
        setMasterPassword(storedPassword);
        handleUnlock();
      }
    } catch (error) {
      setError('Biometric authentication failed');
    }
  };

  const handleSavePassword = async (passwordData) => {
    try {
      const updatedPasswords = editingPassword
        ? passwords.map(p => p.id === editingPassword.id ? { ...passwordData, id: p.id } : p)
        : [...passwords, { ...passwordData, id: crypto.randomUUID() }];

      const encrypted = await encryptData(updatedPasswords, masterPassword);
      
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encrypted)
      });

      setPasswords(updatedPasswords);
      setIsFormOpen(false);
      setEditingPassword(null);
    } catch (error) {
      setError('Failed to save password');
    }
  };

  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      setError('Failed to copy to clipboard');
    }
  };

  const filteredPasswords = passwords.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 relative overflow-hidden">
        <AnimatedGridPattern 
          className="absolute inset-0 z-0 opacity-30"
          width={32}
          height={32}
          numSquares={75}
          maxOpacity={0.1}
          duration={3}
        />
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <Link
              to="/"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <AuroraText as="h1" className="text-3xl font-bold">
              Password Manager
            </AuroraText>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50">
              <div className="text-center mb-6">
                <KeyIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Unlock Password Manager</h2>
                <p className="text-gray-400 text-sm">
                  Enter your master password to access your passwords
                </p>
              </div>

              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Master Password"
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />

              <button
                onClick={handleUnlock}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4"
              >
                Unlock
              </button>

              {isBiometricAvailable && (
                <button
                  onClick={handleBiometricUnlock}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Unlock with Biometrics
                </button>
              )}

              {error && (
                <div className="text-red-400 text-sm text-center mt-4">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 relative overflow-hidden">
      <AnimatedGridPattern 
        className="absolute inset-0 z-0 opacity-30"
        width={32}
        height={32}
        numSquares={75}
        maxOpacity={0.1}
        duration={3}
      />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <AuroraText as="h1" className="text-3xl font-bold">
            Password Manager
          </AuroraText>
          <div className="flex-1" />
          <button
            onClick={() => {
              setEditingPassword(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Password
          </button>
        </div>

        <div className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50">
          <input
            type="search"
            placeholder="Search passwords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
          />

          <div className="space-y-4">
            {filteredPasswords.map(password => (
              <div 
                key={password.id}
                className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">{password.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">{password.username}</p>
                    {password.url && (
                      <a 
                        href={password.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:text-blue-300"
                      >
                        {new URL(password.url).hostname}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyToClipboard(password.password)}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-600/50"
                      title="Copy password"
                    >
                      <ClipboardIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingPassword(password);
                        setIsFormOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-600/50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredPasswords.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No passwords found
              </div>
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <PasswordForm
          onSave={handleSavePassword}
          initialData={editingPassword}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPassword(null);
          }}
        />
      )}

      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
