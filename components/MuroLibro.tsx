"use client";
import MuroPagoBase from "./MuroPagoBase";

interface Props {
  libroId: string;
  titulo: string;
  precioCentavos: number;
}

export default function MuroLibro({ libroId, titulo, precioCentavos }: Props) {
  const precio = (precioCentavos / 100).toFixed(2);
  return (
    <MuroPagoBase
      id={libroId}
      idField="libroId"
      endpoint="/api/libros/comprar"
      titulo={titulo}
      heading={`Comprar por $${precio} USD`}
      descripcionAntes="Acceso permanente al PDF de "
      descripcionDespues=". El enlace de descarga te llega por correo para que puedas acceder desde cualquier dispositivo."
      botonLabel={`Comprar por $${precio} USD`}
    />
  );
}
