-- REVERSIÓN de los títulos aplicados el 2026-11-26 (sesión 45).
-- Devuelve cada publicación a su título y estado de publicación ANTERIORES.
-- Solo ejecutar si hace falta deshacer el cambio (Supabase → SQL Editor).
-- Generado con: SELECT format('UPDATE ... %L ...', titulo, publicado, slug) ANTES del cambio.
-- Después de revertir: /admin → "Sincronizar artículos" (para el asistente IA).
BEGIN;
UPDATE "Publicacion" SET titulo = 'agricultura subsistencia responsabilidad ambiental elsalvador', publicado = 't' WHERE slug = 'agricultura-subsistencia-responsabilidad-ambiental-elsalvador';
UPDATE "Publicacion" SET titulo = 'Articulo 02 Anclaje Material Wood ', publicado = 't' WHERE slug = 'articulo-02-anclaje-material-wood';
UPDATE "Publicacion" SET titulo = 'Articulo 03 Mutaciones Pensamiento Critico', publicado = 't' WHERE slug = 'articulo-03-mutaciones-pensamiento-critico';
UPDATE "Publicacion" SET titulo = 'Articulo 04 Colonialidad Poder Quijano', publicado = 't' WHERE slug = 'articulo-04-colonialidad-poder-quijano';
UPDATE "Publicacion" SET titulo = 'Articulo 06 Desposesion Centroamerica', publicado = 't' WHERE slug = 'articulo-06-desposesion-centroamerica';
UPDATE "Publicacion" SET titulo = 'Bienvenido a Mis Ideas', publicado = 't' WHERE slug = 'bienvenido-a-mis-ideas';
UPDATE "Publicacion" SET titulo = 'Brasil primera vuelta 2026 Dubon', publicado = 't' WHERE slug = 'brasil-primera-vuelta-2026-dubon';
UPDATE "Publicacion" SET titulo = 'denuncia digital juventud sociologia', publicado = 't' WHERE slug = 'denuncia-digital-juventud-sociologia';
UPDATE "Publicacion" SET titulo = 'derecho a la vivienda en el salvador', publicado = 't' WHERE slug = 'derecho-a-la-vivienda-en-el-salvador';
UPDATE "Publicacion" SET titulo = 'Dubon Clases mas nitidas democracias mas fragiles', publicado = 't' WHERE slug = 'dubon-clases-mas-nitidas-democracias-mas-fragiles';
UPDATE "Publicacion" SET titulo = 'Dubon Parte2 Clases nitidas sujetos opacos', publicado = 't' WHERE slug = 'dubon-parte2-clases-nitidas-sujetos-opacos';
UPDATE "Publicacion" SET titulo = 'Economía Moral, Género y Derechos del Comercio Informal en el Centro Histórico de San Salvador', publicado = 't' WHERE slug = 'economia-moral-genero-y-derechos-del-comercio-informal-en-el-centro-historico-de-san-salvador';
UPDATE "Publicacion" SET titulo = 'economia popular informal ES 2026', publicado = 't' WHERE slug = 'economia-popular-informal-es-2026';
UPDATE "Publicacion" SET titulo = 'El Cesar-Dios', publicado = 't' WHERE slug = 'el-cesar-dios';
UPDATE "Publicacion" SET titulo = 'El denominador ausente ', publicado = 't' WHERE slug = 'el-denominador-ausente';
UPDATE "Publicacion" SET titulo = 'El Dios sustantivo', publicado = 't' WHERE slug = 'el-dios-sustantivo';
UPDATE "Publicacion" SET titulo = 'El individuo que olvido ser humano', publicado = 't' WHERE slug = 'el-individuo-que-olvido-ser-humano';
UPDATE "Publicacion" SET titulo = 'El nombre del miedo FINAL', publicado = 't' WHERE slug = 'el-nombre-del-miedo-final';
UPDATE "Publicacion" SET titulo = 'El observador observado: vigilancia epistemológica y reflexividad. Cap 2', publicado = 't' WHERE slug = 'el-observador-observado-vigilancia-epistemologica-y-reflexividad-cap-2';
UPDATE "Publicacion" SET titulo = 'El pueblo que no cuida a sus ancianos está haciendo, sin saberlo, una promesa sobre su propio futuro: que cuando llegue su momento, tampoco habrá nadie que lo cuide.', publicado = 't' WHERE slug = 'el-pueblo-que-no-cuida-a-sus-ancianos-esta-haciendo-sin-saberlo-una-promesa-sobre-su-propio-futuro-que-cuando-llegue-su-momento-tampoco-habra-nadie-que-lo-cuide';
UPDATE "Publicacion" SET titulo = 'entre la gracia y la estructura', publicado = 't' WHERE slug = 'entre-la-gracia-y-la-estructura';
UPDATE "Publicacion" SET titulo = 'Estructura de clases El Salvador', publicado = 't' WHERE slug = 'estructura-de-clases-el-salvador';
UPDATE "Publicacion" SET titulo = 'Foucault: del poder-saber al abandono del concepto de ideología   Cap 8', publicado = 't' WHERE slug = 'foucault-del-poder-saber-al-abandono-del-concepto-de-ideologia-cap-8';
UPDATE "Publicacion" SET titulo = '**Genealogía de un concepto en disputa** Capitulo 1', publicado = 't' WHERE slug = 'genealogia-de-un-concepto-en-disputa-capitulo-1';
UPDATE "Publicacion" SET titulo = 'Hinkelammert Democracia y Totalitarismo', publicado = 't' WHERE slug = 'hinkelammert-democracia-y-totalitarismo';
UPDATE "Publicacion" SET titulo = 'Hinkelammert UtopraxisLat v1', publicado = 't' WHERE slug = 'hinkelammert-utopraxislat-v1';
UPDATE "Publicacion" SET titulo = 'Innovar sin improvisar:', publicado = 't' WHERE slug = 'innovar-sin-improvisar';
UPDATE "Publicacion" SET titulo = 'LA CRISIS DEL SUJETO HISTÓRICO CLÁSICO Laclau, Gorz y Hardt-Negri ante el agotamiento del proletariado fordista', publicado = 't' WHERE slug = 'la-crisis-del-sujeto-historico-clasico-laclau-gorz-y-hardt-negri-ante-el-agotamiento-del-proletariado-fordista';
UPDATE "Publicacion" SET titulo = 'La ética no va al final:', publicado = 't' WHERE slug = 'la-etica-no-va-al-final';
UPDATE "Publicacion" SET titulo = 'La ideologia en disputa   Cap 3', publicado = 't' WHERE slug = 'la-ideologia-en-disputa-cap-3';
UPDATE "Publicacion" SET titulo = 'La ideologia en disputa   Cap 4', publicado = 't' WHERE slug = 'la-ideologia-en-disputa-cap-4-lukacs-y-gramsci-cosificacion-y-hegemonia';
UPDATE "Publicacion" SET titulo = 'La ideologia en disputa   Cap 6: Althusser: aparatos ideológicos e interpelación del sujeto', publicado = 't' WHERE slug = 'la-ideologia-en-disputa-cap-6-althusser-aparatos-ideologicos-e-interpelacion-del-sujeto';
UPDATE "Publicacion" SET titulo = 'La ideologia en disputa Cap 5: La Escuela de Frankfurt: industria cultural y razón instrumental', publicado = 't' WHERE slug = 'la-ideologia-en-disputa-la-escuela-de-frankfurt-industria-cultural-y-razon-instrumental';
UPDATE "Publicacion" SET titulo = 'La ideologia en disputa: Mannheim: sociología del conocimiento y reflexividad   Cap 7', publicado = 't' WHERE slug = 'la-ideologia-en-disputa-mannheim-sociologia-del-conocimiento-y-reflexividad-cap-7';
UPDATE "Publicacion" SET titulo = 'La participación como mediación  Sujeto histórico, organización y poder popular en una teoría crítica de la transformación del Estado en Centroamérica', publicado = 't' WHERE slug = 'la-participacion-como-mediacion-sujeto-historico-organizacion-y-poder-popular-en-una-teoria-critica-de-la-transformacion-del-estado-en-centroamerica';
UPDATE "Publicacion" SET titulo = 'Laclau, Mouffe y Žižek: hegemonía discursiva y el retorno psicoanalítico de la ideología   Cap 9', publicado = 't' WHERE slug = 'laclau-mouffe-y-zizek-hegemonia-discursiva-y-el-retorno-psicoanalitico-de-la-ideologia-cap-9';
UPDATE "Publicacion" SET titulo = 'Manual Analisis Cualitativo AtlasTi', publicado = 't' WHERE slug = 'manual-analisis-cualitativo-atlasti';
UPDATE "Publicacion" SET titulo = 'Reorganización Espacial de la Desigualdad: Gentrificación, Acumulación por Desposesión y Periferización Urbana en el Área Metropolitana de San Salvador', publicado = 't' WHERE slug = 'reorganizacion-espacial-de-la-desigualdad-gentrificacion-acumulacion-por-desposesion-y-periferizacion-urbana-en-el-area-metropolitana-de-san-salvador';
UPDATE "Publicacion" SET titulo = 'Reseña a Hemisferio de Izquierda', publicado = 't' WHERE slug = 'resena-a-hemisferio-de-izquierda';
UPDATE "Publicacion" SET titulo = 'Thompson, Fairclough y van Dijk: hermenéutica profunda y análisis crítico del discurso  Cap 10', publicado = 't' WHERE slug = 'thompson-fairclough-y-van-dijk-hermeneutica-profunda-y-analisis-critico-del-discurso-cap-10';
UPDATE "Publicacion" SET titulo = 'TRES CRISIS UN MODELO Dubon2026 ', publicado = 't' WHERE slug = 'tres-crisis-un-modelo-dubon2026';
UPDATE "Publicacion" SET titulo = 'Vigilancia epistemologica segundo orden Dubon', publicado = 't' WHERE slug = 'vigilancia-epistemologica-segundo-orden-dubon';
COMMIT;
