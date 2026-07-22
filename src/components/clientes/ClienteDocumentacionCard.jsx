// src/components/clientes/ClienteDocumentacionCard.jsx
//
// Versión compacta: la documentación de DNI ya no es obligatoria para
// asegurar, así que esta card no debe pesar visualmente lo mismo que los
// datos de contacto. Miniaturas chicas en vez de los recuadros grandes de
// antes — tocás la miniatura para subir (si está vacía) o para ampliar (si
// ya tiene imagen), sin botones de texto aparte.

import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlinePhotograph, HiPlus, HiX, HiCheck } from "react-icons/hi";

import { uploadToCloudinary } from "../../utils/cloudinary";
import { updateCliente } from "../../store/slices/clientesSlice";
import { Card, ImageLightbox } from "../ui";

const isImageFile = (file) =>
  !!file && (file.type || "").toLowerCase().startsWith("image/");

// Miniatura chica de un lado del DNI.
function Thumb({ label, url, uploading, onClickThumb, onRemove }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="group relative h-16 w-16 sm:h-20 sm:w-20 shrink-0">
        <button
          type="button"
          onClick={onClickThumb}
          disabled={uploading}
          className="h-full w-full rounded-xl overflow-hidden border border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.03] dark:bg-brand-200/[0.03] flex items-center justify-center disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-4 w-4 border-2 border-brand-primary/40 border-t-brand-primary rounded-full animate-spin" />
          ) : url ? (
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <HiPlus className="text-xl text-brand-100/25 dark:text-brand-200/25" />
          )}
        </button>

        {/* Punto de estado */}
        {!uploading && (
          <span
            className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center border-2 border-brand-card dark:border-brand-card-dark ${
              url ? "bg-brand-primary text-white" : "bg-brand-100/20 dark:bg-brand-200/20"
            }`}
          >
            {url && <HiCheck className="text-[10px]" />}
          </span>
        )}

        {/* Quitar — aparece al pasar el mouse, solo si hay imagen */}
        {url && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            title="Quitar"
            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <HiX className="text-[10px]" />
          </button>
        )}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-brand-100/40 dark:text-brand-200/40">
        {label}
      </span>
    </div>
  );
}

export default function ClienteDocumentacionCard({ cliente }) {
  const dispatch = useDispatch();

  const inputFrenteRef = useRef(null);
  const inputDorsoRef = useRef(null);

  const clientId = cliente?.id ?? null;

  const [urlFrente, setUrlFrente] = useState(
    cliente?.archivo_dni_frente || cliente?.archivo_dni || null
  );
  const [urlDorso, setUrlDorso] = useState(cliente?.archivo_dni_dorso || null);

  const [pendFrente, setPendFrente] = useState(null);
  const [pendDorso, setPendDorso] = useState(null);

  const [upF, setUpF] = useState(false);
  const [upD, setUpD] = useState(false);

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setUrlFrente(cliente?.archivo_dni_frente || cliente?.archivo_dni || null);
    setUrlDorso(cliente?.archivo_dni_dorso || null);
  }, [cliente?.archivo_dni_frente, cliente?.archivo_dni_dorso, cliente?.archivo_dni]);

  useEffect(() => {
    const sync = async () => {
      if (!clientId) return;
      const patch = {};
      if (pendFrente) patch.archivo_dni_frente = pendFrente;
      if (pendDorso) patch.archivo_dni_dorso = pendDorso;
      if (!Object.keys(patch).length) return;

      try {
        await dispatch(updateCliente({ id: clientId, ...patch })).unwrap();
        setPendFrente(null);
        setPendDorso(null);
      } catch (e) {
        console.error(e);
        toast.error("No se pudo sincronizar la documentación");
      }
    };
    sync();
  }, [clientId, pendFrente, pendDorso, dispatch]);

  const subir = async (file, setUrl, setPend, field) => {
    if (!isImageFile(file)) throw new Error("Solo imágenes (JPG, PNG, etc.)");

    const folder = `de-thames/clientes/${clientId || "sin-id"}/documentacion`;
    const { secure_url } = await uploadToCloudinary(file, folder);

    if (!secure_url) throw new Error("No se recibió URL");

    setUrl(secure_url);

    if (clientId) {
      await dispatch(updateCliente({ id: clientId, [field]: secure_url })).unwrap();
    } else {
      setPend(secure_url);
    }
  };

  const quitar = async (setUrl, setPend, field) => {
    setUrl(null);
    setPend(null);
    if (clientId) {
      await dispatch(updateCliente({ id: clientId, [field]: null })).unwrap();
    }
  };

  const handleFrenteFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUpF(true);
      await subir(file, setUrlFrente, setPendFrente, "archivo_dni_frente");
      toast.success("Frente actualizado correctamente");
    } catch (er) {
      toast.error(er?.message || "Error al subir la imagen");
    } finally {
      setUpF(false);
    }
  };

  const handleDorsoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUpD(true);
      await subir(file, setUrlDorso, setPendDorso, "archivo_dni_dorso");
      toast.success("Dorso actualizado correctamente");
    } catch (er) {
      toast.error(er?.message || "Error al subir la imagen");
    } finally {
      setUpD(false);
    }
  };

  const handleRemoveFrente = async (e) => {
    e.stopPropagation();
    if (!urlFrente) return;
    try {
      setUpF(true);
      await quitar(setUrlFrente, setPendFrente, "archivo_dni_frente");
      toast.success("Imagen del frente eliminada");
    } catch {
      toast.error("No se pudo eliminar la imagen");
    } finally {
      setUpF(false);
    }
  };

  const handleRemoveDorso = async (e) => {
    e.stopPropagation();
    if (!urlDorso) return;
    try {
      setUpD(true);
      await quitar(setUrlDorso, setPendDorso, "archivo_dni_dorso");
      toast.success("Imagen del dorso eliminada");
    } catch {
      toast.error("No se pudo eliminar la imagen");
    } finally {
      setUpD(false);
    }
  };

  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlinePhotograph className="text-brand-100/40 dark:text-brand-200/40 text-base shrink-0" />
        <h2 className="text-xs font-bold text-brand-100/70 dark:text-brand-200/70 uppercase tracking-wide truncate">
          Documentación
        </h2>
        <span className="text-[9px] font-bold uppercase tracking-widest text-brand-100/30 dark:text-brand-200/30 bg-brand-100/5 dark:bg-brand-200/5 px-1.5 py-0.5 rounded">
          Opcional
        </span>
      </div>

      <div className="flex items-start justify-center gap-6">
        <Thumb
          label="Frente"
          url={urlFrente}
          uploading={upF}
          onClickThumb={() => (urlFrente ? setPreview(urlFrente) : inputFrenteRef.current?.click())}
          onRemove={handleRemoveFrente}
        />
        <Thumb
          label="Dorso"
          url={urlDorso}
          uploading={upD}
          onClickThumb={() => (urlDorso ? setPreview(urlDorso) : inputDorsoRef.current?.click())}
          onRemove={handleRemoveDorso}
        />
      </div>

      <input ref={inputFrenteRef} type="file" accept="image/*" className="hidden" onChange={handleFrenteFile} />
      <input ref={inputDorsoRef} type="file" accept="image/*" className="hidden" onChange={handleDorsoFile} />

      <ImageLightbox url={preview} onClose={() => setPreview(null)} alt="Ampliación del documento" />
    </Card>
  );
}