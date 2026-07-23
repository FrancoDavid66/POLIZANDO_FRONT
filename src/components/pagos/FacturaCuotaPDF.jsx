// src/components/pagos/FacturaCuotaPDF.jsx
import { Page, Text, View, Document, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { formatMoney } from "../../utils/formatMoney";
import { formatDate } from "../../utils/formatDate";
// Logo del comprobante. IMPORTANTE: react-pdf solo soporta PNG/JPG (NO webp).
// ISOTIPO.png debe existir en src/assets/logos/ (mismo nombre y mayúsculas).
import polizandoLogo from "../../assets/logos/ISOTIPO.png";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

// Marca Polizando — mismos tokens que el resto de la app (tailwind.config.js
// theme.extend.colors.brand). react-pdf no lee Tailwind ni fuentes del
// navegador, así que los valores van repetidos acá como constantes.
const PRIMARY = "#1F7A4C";
const PRIMARY_DEEP = "#14603B";
const SECONDARY = "#E2622C";
const SECONDARY_SOFT = "#FFD9C4";
const INK = "#3D322A";
const CREAM = "#F4EFE6";
const CARD = "#FFFDF8";
const ALERT_TEXT = "#991B1B";
const ALERT_BG = "#FEF2F2";

// 🔧 Fuentes: se sacaron los Font.register de Baloo 2 / Nunito que se bajaban
// de Google Fonts (fonts.gstatic.com) — esas URLs .ttf empezaron a dar 404 y
// react-pdf tiraba "Unknown font format", rompiendo la generación del PDF.
// Usamos Helvetica, la fuente estándar que @react-pdf/renderer trae incluida:
// no descarga nada, así el comprobante SIEMPRE se genera. Los pesos se piden
// con fontWeight normal/bold (Helvetica no tiene 800, mapea a bold).
Font.registerHyphenationCallback((word) => [word]);

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

const fmtDateTimeHM = (d) => {
  const s = formatDate(d, { withTime: true, smartTime: true });
  return s.includes(":") ? `${s} hs` : s;
};
const fmtDateOnly = (d) => formatDate(d);
const fmtMoney = (n) => formatMoney(n, { symbol: "AR$" });
const fmtMoneyEntero = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("es-AR");

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const nombreMes = (d) => {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const parts = s.split("-");
  if (parts.length !== 3) return "";
  const mIdx = Number(parts[1]) - 1;
  return MESES_ES[mIdx] ? `${MESES_ES[mIdx]} ${parts[0]}` : "";
};

const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const v = new Date(String(cuota.fecha_vencimiento).slice(0, 10) + "T00:00:00");
  const ref = cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  const pStr = typeof ref === "string" ? ref.slice(0, 10) : new Date(ref).toISOString().slice(0, 10);
  const p = new Date(pStr + "T00:00:00");
  return p.getTime() > v.getTime();
};

const styles = StyleSheet.create({
  page: {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    fontFamily: "Helvetica",
    color: INK,
    backgroundColor: "#E7E1D5",
    padding: 28,
    fontSize: 10.5,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: "hidden",
  },

  // Header
  header: {
    backgroundColor: PRIMARY,
    paddingVertical: 20,
    paddingHorizontal: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: "#fff",
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "contain" },
  brandName: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 20, color: "#fff" },
  brandTagline: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 7.5, letterSpacing: 1.2, color: SECONDARY_SOFT, marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  comprobanteLabel: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 10, letterSpacing: 1.2, color: SECONDARY_SOFT },
  comprobanteValue: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 16, color: "#fff", marginTop: 5 },

  // Meta row (número / fecha)
  metaRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ECE9E3" },
  metaCol: { flex: 1, paddingVertical: 14, paddingHorizontal: 28 },
  metaColBorder: { borderRightWidth: 1, borderRightColor: "#ECE9E3" },
  metaLabel: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 8, letterSpacing: 1, color: "rgba(61,50,42,0.45)" },
  metaValue: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 15, color: INK, marginTop: 5 },

  // Secciones
  section: { paddingHorizontal: 28, paddingTop: 18 },
  sectionLabel: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 8.5, letterSpacing: 1.2, color: SECONDARY, marginBottom: 10 },
  grid2: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", paddingBottom: 12, paddingRight: 12 },
  fieldLabel: { fontFamily: "Helvetica", fontWeight: 700, fontSize: 9, color: "rgba(61,50,42,0.5)" },
  fieldValue: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 11.5, color: INK, marginTop: 3 },

  // Tabla detalle
  table: { borderWidth: 1, borderColor: "#E8E5DF", borderRadius: 10, overflow: "hidden" },
  tableHead: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: CREAM, paddingVertical: 9, paddingHorizontal: 14,
  },
  tableHeadText: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 8.5, letterSpacing: 0.6, color: "rgba(61,50,42,0.55)" },
  tableRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: "#EFEDE8",
  },
  tableRowConcepto: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 12, color: INK },
  tableRowSub: { fontFamily: "Helvetica", fontWeight: 700, fontSize: 9, color: "rgba(61,50,42,0.55)", marginTop: 2 },
  tableRowImporte: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 12.5, color: INK },
  tableRowLabel: { fontFamily: "Helvetica", fontWeight: 700, fontSize: 9.5, color: "rgba(61,50,42,0.7)" },
  tableRowValue: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 10.5, color: INK },

  // Total + sello
  totalRowWrap: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 28, paddingTop: 16 },
  stamp: {
    borderWidth: 2, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11,
    fontFamily: "Helvetica", fontWeight: 800, fontSize: 13, letterSpacing: 0.5,
  },
  totalBox: {
    flex: 1, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  totalBoxLabel: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 10.5, color: SECONDARY_SOFT },
  totalBoxValue: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 22, color: "#fff" },

  // Vencimiento
  dueNotice: {
    marginHorizontal: 28, marginTop: 14, backgroundColor: "#FDF2EC",
    borderWidth: 1, borderColor: "#F9DBCB", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  dueNoticeText: { fontFamily: "Helvetica", fontWeight: 700, fontSize: 9.5, color: INK, lineHeight: 1.4 },
  dueNoticeBold: { fontFamily: "Helvetica", fontWeight: 800, color: SECONDARY },

  // Alertas legales
  alertBox: {
    marginHorizontal: 28, marginTop: 12, borderWidth: 1, borderColor: ALERT_TEXT,
    backgroundColor: ALERT_BG, borderRadius: 10, padding: 13,
  },
  alertTitle: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 9, color: ALERT_TEXT, textAlign: "center", marginBottom: 7, textTransform: "uppercase" },
  alertText: { fontFamily: "Helvetica", fontWeight: 400, fontSize: 9, color: ALERT_TEXT, textAlign: "justify", lineHeight: 1.5 },
  alertBold: { fontFamily: "Helvetica", fontWeight: 800 },

  // Footer
  footer: { backgroundColor: CREAM, marginTop: 18, paddingVertical: 16, paddingHorizontal: 28 },
  footerBadge: {
    alignSelf: "flex-start", backgroundColor: PRIMARY, borderRadius: 100,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  footerBadgeText: { fontFamily: "Helvetica", fontWeight: 800, fontSize: 9.5, color: "#fff" },
  footerText: { fontFamily: "Helvetica", fontWeight: 700, fontSize: 8.8, color: "rgba(61,50,42,0.7)", marginTop: 10, lineHeight: 1.6 },
  footerTextBold: { fontFamily: "Helvetica", fontWeight: 800, color: INK },
});

const FacturaCuotaPDF = ({
  cliente = {},
  poliza = {},
  cuota = {},
  pago_dt_iso,
}) => {
  const titularFinal = `${safe(cliente.nombre || poliza.cliente_nombre, "")} ${safe(cliente.apellido || poliza.cliente_apellido, "")}`.trim() || "—";
  const dniFinal = safe(cliente.dni_cuit_cuil || poliza.cliente_dni || cliente.dni);
  const marca = safe(poliza.marca || poliza.poliza__marca, "");
  const modelo = safe(poliza.modelo || poliza.poliza__modelo, "");
  const patente = safe(poliza.patente || poliza.poliza__patente);
  const numeroPoliza = safe(poliza.numero_poliza || poliza.poliza__numero_poliza);

  const cuotaNro = safe(cuota.cuota_nro);
  const monto = cuota.monto || 0;
  const formaPago = cuota.forma_pago
    ? cuota.forma_pago.charAt(0).toUpperCase() + cuota.forma_pago.slice(1)
    : "—";

  const fechaReferenciaPagoOriginal = pago_dt_iso || cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  const baseDate = new Date(fechaReferenciaPagoOriginal);

  const esPrimeraCuota = String(cuotaNro) === "1";
  const pagoFueraDeTermino = !esPrimeraCuota && isPagoAtrasado(cuota);

  const fechaCobertura = new Date(baseDate.getTime());
  if (esPrimeraCuota || pagoFueraDeTermino) {
    fechaCobertura.setDate(fechaCobertura.getDate() + 1);
  }

  const fechaHoraOperacion = fmtDateTimeHM(baseDate);
  const fechaSoloDiaTxt = fmtDateOnly(fechaCobertura);
  const vencimientoActualTxt = fmtDateOnly(cuota.fecha_vencimiento);
  const cuotaId = cuota.id != null ? `N° ${cuota.id}` : "N° —";
  const whatsappStr = safe(poliza.oficina_whatsapp, "11 3946-2296");

  const vehiculoStr = [marca, modelo].filter(Boolean).join(" ") || "—";

  return (
    <Document>
      <Page size={{ width: A4_WIDTH, height: A4_HEIGHT }} style={styles.page}>
        <View style={styles.card}>
          {/* ENCABEZADO */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBox}>
                <Image src={polizandoLogo} style={styles.logoImg} />
              </View>
              <View>
                <Text style={styles.brandName}>Polizando</Text>
                <Text style={styles.brandTagline}>NO REGALÉS TU PLATA</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.comprobanteLabel}>COMPROBANTE</Text>
              <Text style={styles.comprobanteValue}>DE PAGO</Text>
            </View>
          </View>

          {/* META: número y fecha */}
          <View style={styles.metaRow}>
            <View style={[styles.metaCol, styles.metaColBorder]}>
              <Text style={styles.metaLabel}>N.º DE RECIBO</Text>
              <Text style={styles.metaValue}>{cuotaId}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>FECHA DE PAGO</Text>
              <Text style={styles.metaValue}>{fechaHoraOperacion}</Text>
            </View>
          </View>

          {/* CLIENTE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATOS DEL CLIENTE</Text>
            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.fieldLabel}>Nombre y apellido</Text>
                <Text style={styles.fieldValue}>{titularFinal}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.fieldLabel}>DNI</Text>
                <Text style={styles.fieldValue}>{dniFinal}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.fieldLabel}>N.º de póliza</Text>
                <Text style={styles.fieldValue}>{numeroPoliza}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.fieldLabel}>Vehículo</Text>
                <Text style={styles.fieldValue}>
                  {vehiculoStr}{patente && patente !== "—" ? ` · ${patente}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* DETALLE */}
          <View style={[styles.section, { paddingTop: 8 }]}>
            <Text style={styles.sectionLabel}>DETALLE DEL PAGO</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={styles.tableHeadText}>CONCEPTO</Text>
                <Text style={styles.tableHeadText}>IMPORTE</Text>
              </View>
              <View style={styles.tableRow}>
                <View>
                  <Text style={styles.tableRowConcepto}>Seguro de Auto</Text>
                  <Text style={styles.tableRowSub}>
                    Cuota {cuotaNro}{nombreMes(cuota.fecha_vencimiento) ? ` · Período ${nombreMes(cuota.fecha_vencimiento)}` : ""}
                  </Text>
                </View>
                <Text style={styles.tableRowImporte}>{fmtMoneyEntero(monto)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableRowLabel}>Medio de pago</Text>
                <Text style={styles.tableRowValue}>{formaPago}</Text>
              </View>
            </View>
          </View>

          {/* TOTAL + SELLO */}
          <View style={styles.totalRowWrap}>
            <Text style={[styles.stamp, { borderColor: PRIMARY, color: PRIMARY }]}>PAGADO</Text>
            <View style={styles.totalBox}>
              <Text style={styles.totalBoxLabel}>TOTAL PAGADO</Text>
              <Text style={styles.totalBoxValue}>{fmtMoneyEntero(monto)}</Text>
            </View>
          </View>

          {/* VENCIMIENTO */}
          {cuota.fecha_vencimiento && (
            <View style={styles.dueNotice}>
              <Text style={styles.dueNoticeText}>
                Vencimiento de esta cuota: <Text style={styles.dueNoticeBold}>{vencimientoActualTxt}</Text>.
              </Text>
            </View>
          )}

          {/* ALERTA PRIMERA CUOTA */}
          {esPrimeraCuota && (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>Aviso Legal: Inicio de Cobertura</Text>
              <Text style={styles.alertText}>
                El cliente toma conocimiento de que su vehículo comenzará a tener cobertura a partir del{" "}
                <Text style={styles.alertBold}>día siguiente</Text> a la realización de este pago (Fecha de
                cobertura: <Text style={styles.alertBold}>{fechaSoloDiaTxt}</Text>).
              </Text>
            </View>
          )}

          {/* ALERTA PAGO ATRASADO */}
          {pagoFueraDeTermino && (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>Aviso Legal: Pago fuera de término</Text>
              <Text style={styles.alertText}>
                El cliente acepta y confirma bajo juramento que{" "}
                <Text style={styles.alertBold}>NO ha tenido ningún siniestro ni reclamo</Text> en los días
                previos a este pago, durante los cuales la póliza se encontraba vencida.{"\n\n"}
                Asimismo, toma conocimiento de que la cobertura retomará su vigencia a partir del{" "}
                <Text style={styles.alertBold}>día siguiente</Text> a este pago (Fecha de cobertura:{" "}
                <Text style={styles.alertBold}>{fechaSoloDiaTxt}</Text>), período en el cual{" "}
                <Text style={styles.alertBold}>TAMPOCO TENDRÁ COBERTURA</Text>.
              </Text>
            </View>
          )}

          {/* PIE */}
          <View style={styles.footer}>
            <View style={styles.footerBadge}>
              <Text style={styles.footerBadgeText}>¡Gracias por confiar en Polizando!</Text>
            </View>
            <Text style={styles.footerText}>
              WhatsApp <Text style={styles.footerTextBold}>{whatsappStr}</Text> · www.polizando.com{"\n"}
              Comprobante válido como constancia de pago.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default FacturaCuotaPDF;