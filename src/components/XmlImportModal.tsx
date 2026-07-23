import React, { useState } from 'react';
import { Upload, FileCode, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { parseTimelineXML, ParsedTimelineData } from '../utils/xmlParser';

interface XmlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ParsedTimelineData) => void;
}

export const XmlImportModal: React.FC<XmlImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    setError(null);
    setSuccessInfo(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setXmlContent(text);
        tryParseAndValidate(text);
      }
    };
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier.');
    };
    reader.readAsText(file);
  };

  const tryParseAndValidate = (xmlStr: string) => {
    try {
      const parsed = parseTimelineXML(xmlStr);
      if (!parsed.events || parsed.events.length === 0) {
        setError("Aucun événement valide n'a été trouvé dans le fichier XML.");
        setSuccessInfo(null);
        return null;
      }
      setSuccessInfo(
        `Fichier valide ! ${parsed.eras.length} ères, ${parsed.categories.length} catégories, ${parsed.events.length} événements extraits.`
      );
      setError(null);
      return parsed;
    } catch (err: any) {
      setError(`Erreur de parsing XML: ${err?.message || 'Structure invalide'}`);
      setSuccessInfo(null);
      return null;
    }
  };

  const handleConfirmImport = () => {
    const parsed = tryParseAndValidate(xmlContent);
    if (parsed) {
      onImport(parsed);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-stone-900 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 border border-purple-200 rounded-xl text-purple-600">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-950">
              Importer un fichier Chronologie (.timeline)
            </h3>
            <p className="text-xs text-stone-500">
              Importez votre fichier XML personnel "Biblic_Timeline.timeline"
            </p>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className="border-2 border-dashed border-stone-200 hover:border-purple-300 rounded-xl p-6 text-center bg-stone-50 hover:bg-stone-100 transition cursor-pointer mb-4"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.timeline,.xml';
            input.onchange = (e: any) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            };
            input.click();
          }}
        >
          <FileCode className="w-10 h-10 mx-auto text-purple-600 mb-2 opacity-80" />
          <p className="text-sm font-medium text-stone-800">
            Glissez-déposez votre fichier <span className="text-purple-600 font-mono">.timeline</span> ici
          </p>
          <p className="text-xs text-stone-500 mt-1">
            ou cliquez pour parcourir vos fichiers
          </p>
        </div>

        {/* Text Area fallback */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Ou collez le contenu XML directement :
          </label>
          <textarea
            rows={4}
            value={xmlContent}
            onChange={(e) => {
              setXmlContent(e.target.value);
              if (e.target.value) tryParseAndValidate(e.target.value);
            }}
            placeholder="<?xml version='1.0' encoding='utf-8'?>&#10;<timeline>...</timeline>"
            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs font-mono text-stone-800 focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!xmlContent || !!error}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            Appliquer l'importation
          </button>
        </div>
      </div>
    </div>
  );
};
