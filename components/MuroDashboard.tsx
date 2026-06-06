"use client";
import MuroPagoBase from "./MuroPagoBase";

interface Props {
  tableroId: string;
  titulo: string;
  precioCentavos: number;
}

export default function MuroDashboard({ tableroId, titulo, precioCentavos }: Props) {
  const precio = (precioCentavos / 100).toFixed(2);
  return (
    <MuroPagoBase
      id={tableroId}
      idField="tableroId"
      endpoint="/api/dashboard/comprar"
      titulo={titulo}
      heading={`Comprar por $${precio} USD`}
      descripcionAntes="Acceso permanente al tablero "
      descripcionDespues=". El enlace de acceso te llega por correo para que puedas abrir las tablas y descargar el Excel desde cualquier dispositivo."
      botonLabel={`Comprar por $${precio} USD`}
    />
  );
}
