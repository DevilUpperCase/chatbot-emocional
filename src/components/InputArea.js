import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip, faTimes, faFilePdf } from '@fortawesome/free-solid-svg-icons';

function InputArea({ onSendMessage }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Store { file: File, previewUrl: string | null }
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 150;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
    // Cleanup preview URLs on unmount
    return () => {
      selectedFiles.forEach(fileData => {
        if (fileData.previewUrl && fileData.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fileData.previewUrl);
        }
      });
    };
  }, [selectedFiles]); // Add selectedFiles dependency for cleanup logic

  const handleSendClick = () => {
    const messageText = inputValue.trim();
    if (messageText || selectedFiles.length > 0) {
      // Pass the file objects, not the preview data
      onSendMessage(messageText, selectedFiles.map(fd => fd.file));
      setInputValue('');
      // Clean up previews before clearing state
      selectedFiles.forEach(fileData => {
        if (fileData.previewUrl && fileData.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fileData.previewUrl);
        }
      });
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }, 0);
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const validFilesPromises = files
      .filter(file => file.type.startsWith('image/') || file.type === 'application/pdf')
      .map(file => {
        return new Promise((resolve) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Use blob URL for efficient preview
              const blobUrl = URL.createObjectURL(file);
              resolve({ file: file, previewUrl: blobUrl });
            };
            reader.readAsDataURL(file); // Read needed, but use blob URL
          } else {
            // For PDF, no visual preview, just store the file
            resolve({ file: file, previewUrl: null });
          }
        });
      });

    Promise.all(validFilesPromises).then(newFilesData => {
         setSelectedFiles(prevFiles => {
             // Simple duplicate check based on name and size
             const incomingSignatures = new Set(newFilesData.map(f => `${f.file.name}-${f.file.size}`));
             const uniquePrevFiles = prevFiles.filter(pf => !incomingSignatures.has(`${pf.file.name}-${pf.file.size}`));
             return [...uniquePrevFiles, ...newFilesData];
         });
    });


    if (files.length > validFilesPromises.length) {
      alert('Algunos archivos no son imágenes o PDF y no fueron añadidos.');
    }
     // Reset input value to allow selecting the same file again after removing it
    event.target.value = null;
  };

  const removeFile = (indexToRemove) => {
    const fileToRemove = selectedFiles[indexToRemove];
    if (fileToRemove.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleAttachmentClick = () => {
    fileInputRef.current.click();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendClick();
    }
  };

  const isSendDisabled = inputValue.trim().length === 0 && selectedFiles.length === 0;

  return (
    <div className="input-area-wrapper">
      {selectedFiles.length > 0 && (
        <div className="selected-files-preview">
          {selectedFiles.map((fileData, index) => (
            <div key={index} className="file-chip">
              {fileData.previewUrl ? (
                <img src={fileData.previewUrl} alt="Preview" className="file-thumbnail" />
              ) : (
                <FontAwesomeIcon icon={faFilePdf} className="file-thumbnail pdf-icon" />
              )}
              <span title={fileData.file.name}>{fileData.file.name}</span>
              <button onClick={() => removeFile(index)} title="Quitar archivo">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="input-container">
        <textarea
          ref={textareaRef}
          id="message-input"
          placeholder="Escribe tu mensaje o adjunta archivos..."
          rows="1"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        <button
          id="attachment-button"
          onClick={handleAttachmentClick}
          title="Adjuntar archivo"
          className="attachment-button"
        >
          <FontAwesomeIcon icon={faPaperclip} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          multiple
          style={{ display: 'none' }}
        />
        <button
          id="send-button"
          onClick={handleSendClick}
          disabled={isSendDisabled}
          title="Enviar mensaje"
        >
          <FontAwesomeIcon icon={faPaperPlane} />
        </button>
      </div>
    </div>
  );
}

export default InputArea;