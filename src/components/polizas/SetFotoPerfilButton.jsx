// src/components/polizas/SetFotoPerfilButton.jsx
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { PolizasAPI } from "../../api/polizas";
import { HiCamera } from "react-icons/hi";
// 🚀 IMPORTAMOS AUTH PARA SEGURIDAD Y CONTEXTO
import { useAuth } from "../../context/AuthContext";

export default function SetFotoPerfilButton({ polizaId, onPerfilActualizado }) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const openPicker = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);

      // Subida a Cloudinary (RC-ADMIN)
      const { secure_url, public_id } = await uploadToCloudinary(
        file,
        "rc-admin/vehiculos/perfil"
      );

      const id =
        typeof polizaId === "object" ? polizaId?.id ?? null : polizaId;

      if (!id) throw new Error("ID de póliza inválido");

      // 🚀 PolizasAPI ya usa la instancia central 'api' con el Token JWT
      await PolizasAPI.setFotoPerfil(id, { url: secure_url, public_id });

      toast.success("Foto de perfil actualizada");
      
      // Callback para refrescar el Header o el detalle
      onPerfilActualizado?.();
    } catch (err) {
      console.error("[SetFotoPerfil] Error:", err);
      // El error 401/403 es manejado por el interceptor, pero damos feedback local
      const errorMsg = err?.response?.data?.detail || err?.message || "Error al actualizar foto";
      toast.error(errorMsg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Input oculto para disparar el selector de archivos */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        title={`Cambiar foto de perfil como: ${user?.perfil?.nombre || 'Usuario'}`}
        className={`inline-flex items-center gap-2 rounded-lg border border-brand-100/10 dark:border-brand-200/10 
                    bg-brand-100/5 dark:bg-brand-200/5 px-3 py-1.5 text-xs sm:text-sm text-brand-100/80 dark:text-brand-200/80 
                    hover:bg-brand-100/10 dark:hover:bg-brand-200/10 transition
                    disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <HiCamera className="h-4 w-4 text-brand-primary dark:text-brand-primary-tint" />
        <span className="hidden sm:inline">
          {busy ? "Subiendo..." : "Cambiar foto"}
        </span>
      </button>
    </>
  );
}