// src/components/ui/ImageLightbox.jsx
//
// Visor de imagen a pantalla completa. Extraído de ClienteDatosPersonalesCard
// y ClienteDocumentacionCard, que tenían exactamente el mismo código pegado
// dos veces (mismo backdrop, mismo botón de cerrar, misma animación).
//
// Uso:
//   const [preview, setPreview] = useState(null);
//   <img onClick={() => setPreview(url)} .../>
//   <ImageLightbox url={preview} onClose={() => setPreview(null)} />

import { motion, AnimatePresence } from "framer-motion";
import { HiX } from "react-icons/hi";

export function ImageLightbox({ url, onClose, alt = "Imagen ampliada" }) {
  return (
    <AnimatePresence>
      {url && (
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-3 rounded-2xl bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-lg"
          >
            <HiX className="text-xl" />
          </button>

          <motion.div
            key="lightbox-image"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full flex items-center justify-center"
          >
            <div className="rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              <img
                src={url}
                alt={alt}
                className="max-w-full max-h-[80vh] object-contain select-none"
                draggable={false}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ImageLightbox;