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
  KeyIcon,
  DocumentArrowUpIcon // Add this import
} from '@heroicons/react/24/outline';
import PasswordForm from '../components/password/PasswordForm';
import { encryptData, decryptData } from '../utils/encryption';
import { registerBiometric, verifyBiometric } from '../utils/biometric';
import Toast from '../components/ui/Toast';

const WORKER_URL = 'https://password-manager.accounts-abd.workers.dev';

export default function Passwords() {
  const [isLocked, setIsLocked] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [passwords, setPasswords] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

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

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const checkBiometricData = () => {
    const storedData = localStorage.getItem('biometricData');
    return storedData ? JSON.parse(storedData) : null;
  };

  const handleBiometricSetup = async () => {
    try {
      if (!masterPassword) {
        showToast('Please unlock the password manager first', 'warning');
        return;
      }

      const existingData = checkBiometricData();
      if (existingData) {
        const confirmed = window.confirm('Biometric data already exists. Do you want to reset it?');
        if (!confirmed) return;
      }

      console.log('Starting biometric setup...');
      const result = await registerBiometric(masterPassword);
      console.log('Biometric setup result:', result);
      showToast('Biometric authentication setup complete', 'success');
    } catch (error) {
      console.error('Detailed biometric setup error:', error);
      showToast(`Biometric setup failed: ${error.message}`, 'error');
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      const existingData = checkBiometricData();
      if (!existingData) {
        showToast('Please set up biometric authentication first', 'warning');
        return;
      }

      const storedPassword = await verifyBiometric();
      setMasterPassword(storedPassword);
      await handleUnlock();
    } catch (error) {
      console.error('Biometric unlock error:', error);
      setError(error.message || 'Biometric authentication failed');
      showToast('Biometric authentication failed. Please use your master password.', 'error');
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

  const handleChangeMasterPassword = async (newPassword) => {
    try {
      // Re-encrypt all passwords with new master password
      const encrypted = await encryptData(passwords, newPassword);
      
      // Save to server
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encrypted)
      });

      // Update local master password
      setMasterPassword(newPassword);
      sessionStorage.setItem('masterPassword', newPassword);
      setShowChangePassword(false);
      showToast('Master password updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update master password', 'error');
    }
  };

  const handleDeletePassword = async (password) => {
    try {
      // Re-encrypt all passwords except the deleted one
      const updatedPasswords = passwords.filter(p => p.id !== password.id);
      const encrypted = await encryptData(updatedPasswords, masterPassword);
      
      // Save to server
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encrypted)
      });

      setPasswords(updatedPasswords);
      showToast('Password deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting password:', error);
      showToast('Failed to delete password', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const parseXmlPasswords = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const passwords = [];
    
    const entries = xmlDoc.getElementsByTagName("password");
    for (const entry of entries) {
      const password = {
        title: entry.getElementsByTagName("title")[0]?.textContent,
        username: entry.getElementsByTagName("username")[0]?.textContent,
        password: entry.getElementsByTagName("password")[0]?.textContent,
        url: entry.getElementsByTagName("url")[0]?.textContent || '',
        notes: entry.getElementsByTagName("notes")[0]?.textContent || '',
        tags: Array.from(entry.getElementsByTagName("tag")).map(tag => tag.textContent)
      };
      
      if (password.title && password.username && password.password) {
        passwords.push(password);
      }
    }
    return passwords;
  };

  const handleImport = async (fileOrText, isFile = true) => {
    try {
      let text = isFile ? await fileOrText.text() : fileOrText;

      // Only parse as XML
      if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<passwords>')) {
        showToast('Invalid format. Please use XML format', 'error');
        return;
      }

      const importedPasswords = parseXmlPasswords(text);

      if (importedPasswords.length === 0) {
        showToast('No valid passwords found', 'error');
        return;
      }

      // Add IDs to imported passwords
      const passwordsWithIds = importedPasswords.map(p => ({
        ...p,
        id: crypto.randomUUID()
      }));

      // Merge with existing passwords
      const updatedPasswords = [...passwords, ...passwordsWithIds];

      // Encrypt and save
      const encrypted = await encryptData(updatedPasswords, masterPassword);
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encrypted)
      });

      setPasswords(updatedPasswords);
      showToast(`Successfully imported ${importedPasswords.length} passwords`, 'success');
      setShowImportModal(false);
    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import passwords', 'error');
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
                <h2 className="text-xl font-semibold mb-2 text-white">Unlock Password Manager</h2>
                <p className="text-gray-300 text-sm">
                  Enter your master password to access your passwords
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleUnlock();
              }}>
                <input 
                  type="text"
                  autoComplete="username"
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Master Password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-white placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4"
                >
                  Unlock
                </button>
              </form>

              {isBiometricAvailable && (
                <div>
                  <button
                    onClick={handleBiometricUnlock}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2"
                  >
                    <KeyIcon className="w-5 h-5" />
                    {checkBiometricData() ? 'Unlock with Biometrics' : 'Biometrics Not Set Up'}
                  </button>
                  {!checkBiometricData() && (
                    <p className="text-gray-200 text-xs text-center mt-2">
                      Unlock with password first to set up biometrics
                    </p>
                  )}
                </div>
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
    <>
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
            {isBiometricAvailable && (
              <button
                onClick={handleBiometricSetup}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Setup Biometric
              </button>
            )}
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Change Master Password
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              Import
            </button>
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
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 text-white placeholder-gray-400"
            />

            <div className="space-y-4">
              {filteredPasswords.map(password => (
                <div 
                  key={password.id}
                  className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold mb-1 text-white">{password.title}</h3>
                      <p className="text-gray-200 text-sm mb-2">{password.username}</p>
                      {password.url && (
                        <a 
                          href={password.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-sm hover:text-blue-300"
                        >
                          {(() => {
                            try {
                              return new URL(password.url).hostname;
                            } catch {
                              return password.url;
                            }
                          })()}
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
                      <button
                        onClick={() => setShowDeleteConfirm(password)}
                        className="p-2 text-red-400 hover:text-red-500 rounded-lg hover:bg-gray-600/50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredPasswords.length === 0 && (
                <div className="text-center text-gray-200 py-8">
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

        {showChangePassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4 text-white">Change Master Password</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const newPassword = e.target.newPassword.value;
                const confirmPassword = e.target.confirmPassword.value;
                
                if (newPassword !== confirmPassword) {
                  setError('Passwords do not match');
                  return;
                }
                
                handleChangeMasterPassword(newPassword);
              }}>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="New Master Password"
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-white placeholder-gray-400"
                  required
                  minLength={12}
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-white placeholder-gray-400"
                  required
                  minLength={12}
                />
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4 text-white">Delete Password</h2>
              <p className="text-gray-200 mb-6">
                Are you sure you want to delete the password for "{showDeleteConfirm.title}"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePassword(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-4 text-white">Import Passwords</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-white">XML Format</h3>
                  <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm text-white">
{`<?xml version="1.0" encoding="UTF-8"?>
<passwords>
  <password>
    <title>Example Service</title>
    <username>user@example.com</username>
    <password>your-password-here</password>
    <url>https://example.com</url>
    <notes>Optional notes</notes>
    <tags>
      <tag>optional</tag>
      <tag>tags</tag>
    </tags>
  </password>
</passwords>`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Paste XML here:
                  </label>
                  <textarea
                    className="w-full h-40 bg-gray-700/50 rounded-lg p-3 text-sm font-mono text-white placeholder-gray-400"
                    placeholder="Paste your XML data here..."
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        handleImport(e.target.value, false);
                      }
                    }}
                  />
                </div>

                <div className="text-center">
                  <span className="text-gray-200">- OR -</span>
                </div>

                <div className="flex justify-center">
                  <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer">
                    Upload XML File
                    <input
                      type="file"
                      accept=".xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleImport(file, true);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-200 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
