-- Títulos aprobados por el usuario (sesión 45, 2026-11-26): docs/propuesta-titulos-y-series.md
-- (sin el #30, que quedó como duda). Aplicado en producción con el SQL de abajo.
-- Reversión: docs/reversion-titulos-2026-11-26.sql
BEGIN;
UPDATE "Publicacion" AS p SET titulo = v.t FROM (VALUES
 ('genealogia-de-un-concepto-en-disputa-capitulo-1','Genealogía de un concepto en disputa'),
 ('el-observador-observado-vigilancia-epistemologica-y-reflexividad-cap-2','El observador observado: vigilancia epistemológica y reflexividad'),
 ('la-ideologia-en-disputa-cap-3','Marx: la cámara oscura y la falsa conciencia'),
 ('la-ideologia-en-disputa-cap-4-lukacs-y-gramsci-cosificacion-y-hegemonia','Lukács y Gramsci: cosificación y hegemonía'),
 ('la-ideologia-en-disputa-la-escuela-de-frankfurt-industria-cultural-y-razon-instrumental','La Escuela de Frankfurt: industria cultural y razón instrumental'),
 ('la-ideologia-en-disputa-cap-6-althusser-aparatos-ideologicos-e-interpelacion-del-sujeto','Althusser: aparatos ideológicos e interpelación del sujeto'),
 ('la-ideologia-en-disputa-mannheim-sociologia-del-conocimiento-y-reflexividad-cap-7','Mannheim: sociología del conocimiento y reflexividad'),
 ('foucault-del-poder-saber-al-abandono-del-concepto-de-ideologia-cap-8','Foucault: del poder-saber al abandono del concepto de ideología'),
 ('laclau-mouffe-y-zizek-hegemonia-discursiva-y-el-retorno-psicoanalitico-de-la-ideologia-cap-9','Laclau, Mouffe y Žižek: hegemonía discursiva y el retorno psicoanalítico de la ideología'),
 ('thompson-fairclough-y-van-dijk-hermeneutica-profunda-y-analisis-critico-del-discurso-cap-10','Thompson, Fairclough y van Dijk: hermenéutica profunda y análisis crítico del discurso'),
 ('dubon-clases-mas-nitidas-democracias-mas-fragiles','Clases más nítidas, democracias más frágiles'),
 ('dubon-parte2-clases-nitidas-sujetos-opacos','Clases nítidas, sujetos opacos'),
 ('brasil-primera-vuelta-2026-dubon','Brasil: la victoria incompleta de la derecha y la derrota relativa de Lula'),
 ('el-nombre-del-miedo-final','El nombre del miedo'),
 ('vigilancia-epistemologica-segundo-orden-dubon','Vigilancia epistemológica de segundo orden'),
 ('tres-crisis-un-modelo-dubon2026','Tres crisis, un modelo'),
 ('articulo-02-anclaje-material-wood','El anclaje material y sus límites'),
 ('articulo-03-mutaciones-pensamiento-critico','Las mutaciones del pensamiento crítico (1968–2011)'),
 ('articulo-04-colonialidad-poder-quijano','Colonialidad del poder y sujeto histórico en América Latina'),
 ('articulo-06-desposesion-centroamerica','Acumulación por desposesión y resistencia territorial en Centroamérica'),
 ('hinkelammert-utopraxislat-v1','Racionalidad perversa, periferia estructural y subdesarrollo como destino'),
 ('hinkelammert-democracia-y-totalitarismo','Análisis de «Democracia y totalitarismo», de Franz Hinkelammert'),
 ('manual-analisis-cualitativo-atlasti','Manual de análisis cualitativo asistido por software (Atlas.ti)'),
 ('economia-popular-informal-es-2026','La economía popular informal en El Salvador'),
 ('derecho-a-la-vivienda-en-el-salvador','Una deuda de siglos: el Estado salvadoreño y el derecho a la vivienda'),
 ('agricultura-subsistencia-responsabilidad-ambiental-elsalvador','Desplazamiento discursivo y culpabilización estructural: agricultura de subsistencia y el responsable ambiental en El Salvador'),
 ('denuncia-digital-juventud-sociologia','Sospecha, estigma y algoritmo: juventud, prejuicio y cultura de la denuncia en redes sociales'),
 ('estructura-de-clases-el-salvador','Estructura de clases y posición estratégica del trabajo en El Salvador contemporáneo'),
 ('el-pueblo-que-no-cuida-a-sus-ancianos-esta-haciendo-sin-saberlo-una-promesa-sobre-su-propio-futuro-que-cuando-llegue-su-momento-tampoco-habra-nadie-que-lo-cuide','Los que nos construyeron'),
 ('entre-la-gracia-y-la-estructura','Entre la gracia y la estructura'),
 ('el-individuo-que-olvido-ser-humano','El individuo que olvidó ser humano'),
 ('el-cesar-dios','El César-Dios'),
 ('el-dios-sustantivo','El Dios-sustantivo'),
 ('el-denominador-ausente','El denominador ausente'),
 ('innovar-sin-improvisar','Innovar sin improvisar: criterios para adoptar métodos emergentes en la investigación social aplicada'),
 ('la-etica-no-va-al-final','La ética no va al final: decisiones metodológicas como decisiones morales'),
 ('la-crisis-del-sujeto-historico-clasico-laclau-gorz-y-hardt-negri-ante-el-agotamiento-del-proletariado-fordista','La crisis del sujeto histórico clásico: Laclau, Gorz y Hardt-Negri ante el agotamiento del proletariado fordista'),
 ('reorganizacion-espacial-de-la-desigualdad-gentrificacion-acumulacion-por-desposesion-y-periferizacion-urbana-en-el-area-metropolitana-de-san-salvador','Reorganización espacial de la desigualdad: gentrificación, acumulación por desposesión y periferización urbana en San Salvador'),
 ('economia-moral-genero-y-derechos-del-comercio-informal-en-el-centro-historico-de-san-salvador','No son el problema: economía moral, género y comercio informal en el Centro Histórico de San Salvador'),
 ('la-participacion-como-mediacion-sujeto-historico-organizacion-y-poder-popular-en-una-teoria-critica-de-la-transformacion-del-estado-en-centroamerica','La participación como mediación: sujeto histórico, organización y poder popular en Centroamérica'),
 ('resena-a-hemisferio-de-izquierda','Reseña de «Hemisferio izquierda», de Razmig Keucheyan')
) AS v(s, t) WHERE p.slug = v.s;
UPDATE "Publicacion" SET publicado = false WHERE slug = 'bienvenido-a-mis-ideas';
COMMIT;
