-- W1 (advisor de seguridad de Supabase): la política permitía INSERT anónimo en
-- SolicitudCotizacion vía PostgREST con la anon key (WITH CHECK true),
-- saltándose el rate-limit, el honeypot y la validación de /api/cotizaciones
-- (riesgo de spam / inserción masiva).
--
-- La app crea las cotizaciones con Prisma (conexión directa que bypassa RLS),
-- así que NO depende de esta política. Eliminarla cierra el vector sin romper el
-- formulario público. Reversible: recrear la policy si hiciera falta.
DROP POLICY IF EXISTS "insercion_publica_cotizacion" ON "SolicitudCotizacion";
