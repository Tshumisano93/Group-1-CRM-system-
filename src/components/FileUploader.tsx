import React, { useRef } from 'react';
import { X, Upload, File, Play } from 'lucide-react';

interface FileUploaderProps {
  files: File[];
  setFiles: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
}

export default function FileUploader({ files, setFiles, maxFiles = 10, maxSizeBytes = 100 * 1024 * 1024 }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      const validFiles = newFiles.filter(file => {
        const isTypeValid = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'].includes(file.type);
        const isSizeValid = file.size <= maxSizeBytes;
        return isTypeValid && isSizeValid;
      });
      setFiles([...files, ...validFiles].slice(0, maxFiles));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-gov-blue hover:bg-slate-50 transition-all"
      >
        <Upload className="mx-auto text-slate-400 mb-2" size={24} />
        <p className="text-xs text-slate-600 font-bold">Click to upload or drag files here</p>
        <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, WEBP, PDF, MP4, MOV, AVI, WEBM (Max {maxSizeBytes / (1024 * 1024)}MB per file)</p>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden text-base" multiple accept="image/*,.pdf,video/*" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {files.map((file, index) => (
          <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 h-20">
            {file.type.startsWith('image/') ? (
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
            ) : file.type.startsWith('video/') ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white text-xs font-bold">
                <Play size={20} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-xs font-bold p-1 text-center">
                <File size={16} />
                <span className="truncate w-full">{file.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
