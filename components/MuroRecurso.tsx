"use client";
import MuroPagoBase from "./MuroPagoBase";

interface Props {
  recursoId: string;
  titulo: string;
  precioCentavos: number;
}

export default function MuroRecurso({ recursoId, titulo, precioCentavos }: Props) {
  const precio = (precioCentavos / 100).toFixed(2);
  return (
    <MuroPagoBase
      id={recursoId}
      idField="recursoId"
      endpoint="/api/recursos/comprar"
      titulo={titulo}
      heading={`Comprar por $${precio} USD`}
      descripcionAntes="Acceso permanente al recurso "
      descripcionDespues=". El enlace de acceso te llega por correo para que puedas abrirlo y descargarlo desde cualquier dispositivo."
      botonLabel={`Comprar por $${precio} USD`}
    />
  );
}
