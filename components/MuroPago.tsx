"use client";
import MuroPagoBase from "./MuroPagoBase";

interface Props {
  publicacionId: string;
  titulo: string;
  precioCentavos: number;
}

export default function MuroPago({ publicacionId, titulo, precioCentavos }: Props) {
  const precio = (precioCentavos / 100).toFixed(2);
  return (
    <MuroPagoBase
      id={publicacionId}
      idField="publicacionId"
      endpoint="/api/comprar"
      titulo={titulo}
      heading={`Continúa leyendo por $${precio} USD`}
      descripcionAntes="Compra única que te da acceso permanente a "
      descripcionDespues=". El enlace para abrirlo te llega por correo."
      botonLabel={`Comprar acceso por $${precio}`}
      conDegradado
    />
  );
}
