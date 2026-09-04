import React, { useState } from "react";
import { sendCanvasToApi } from "../config/helpers";

const Preview = ({ order, onBack }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(order.status ?? "pendiente");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [orderId, setOrderId] = useState(order.id);

  if (!order) {
    return null;
  }

  const handleConfirmOrder = async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    setConfirmStatus("Enviando solicitud...");
    setConfirmMessage("");

    try {
      const result = await sendCanvasToApi({
        image: order.image,
        designColor: order.color,
        logoTexture: order.logoActive ? order.logoTexture : null,
        fullTexture: order.fullTextureActive ? order.fullTexture : null,
        logoScale: order.logoScale,
        notes: "Confirmación de pedido desde la vista previa",
      });

      setOrderId(result.id ?? orderId);
      setConfirmStatus(result.status ?? "confirmado");
      setConfirmMessage("Solicitud enviada correctamente.");
    } catch (error) {
      setConfirmStatus("Error al enviar");
      setConfirmMessage(error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className="absolute inset-0 flex items-center justify-center p-6 bg-[#061220] backdrop-blur-sm">
      <div className="glassmorphism max-w-4xl w-full rounded-[40px] border-[1px] border-[#1f3b65]/40 p-6 shadow-2xl text-white bg-[#071727]/95">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Previsualización del pedido</h1>
            <p className="mt-2 text-sm text-slate-300">Revisa la imagen y los detalles antes de confirmar.</p>
          </div>
          <span className="rounded-full bg-slate-800/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">Pedido pendiente</span>
        </div>

        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="flex-1 rounded-[32px] bg-[#091826]/95 p-5 shadow-inner shadow-[#020b17]/80">
            <div className="rounded-[28px] border border-slate-800 bg-[#091826]/95 p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">Diseño capturado</div>
              <div className="relative mx-auto h-[450px] max-h-[calc(100vh-220px)] w-full overflow-hidden rounded-[32px] bg-[#050b15] border border-slate-900">
                {order.image ? (
                  <img
                    src={order.image}
                    alt="Preview del pedido"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">No hay imagen disponible</div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#050b15]/95 via-[#050b15]/30 to-transparent" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Pedido creado</h2>
              <p className="mt-2 text-sm text-slate-300">Revisa los detalles del pedido antes de confirmar o volver a personalizar.</p>

              <div className="mt-6 space-y-3 text-sm text-slate-100">
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <span className="font-semibold">ID pedido</span>
                  <span>{order.id ?? "pendiente"}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <span className="font-semibold">Estado</span>
                  <span>{order.status ?? "pendiente"}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <span className="font-semibold">Color</span>
                  <span>{order.color}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <span className="font-semibold">Logo activo</span>
                  <span>{order.logoActive ? "Sí" : "No"}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <span className="font-semibold">Full texture</span>
                  <span>{order.fullTexture ? "Sí" : "No"}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <span className="font-semibold">Tamaño del logo</span>
                  <span>{order.logoScale?.toFixed(2) ?? "-"}</span>
                </div>
                {order.imageUrl && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-slate-900/80 p-4">
                    <span className="font-semibold">Cloudinary URL</span>
                    <a
                      href={order.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 break-all text-sm"
                    >
                      {order.imageUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmOrder}
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {isConfirming ? "Enviando..." : "Confirmar solicitud"}
              </button>
              <button
                onClick={onBack}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Volver a personalizar
              </button>
            </div>
            {confirmMessage && (
              <div className="rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">Estado:</p>
                <p>{confirmStatus}</p>
                <p className="mt-2 text-slate-300">{confirmMessage}</p>
                {orderId && <p className="mt-2 text-slate-300">ID pedido: {orderId}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Preview;
