import numpy as np
import pandas as pd
from pathlib import Path
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Clase de resultado
# ---------------------------------------------------------------------------

@dataclass
class CalibratedDate:
    sample_id   : str
    bp          : float
    sd          : float
    cal_bp      : np.ndarray
    probability : np.ndarray
    curved_name : str = "intcal20"

    def to_bcad(self) -> np.ndarray:
        return 1950 - self.cal_bp

    def hpd(self, prob: float = 0.95) -> list[tuple[float, float]]:
        p = self.probability.copy()

        # 🔥 Asegurar normalización correcta (integral)
        area = np.trapezoid(p, self.cal_bp)
        if area > 0:
            p = p / area

        # Ordenar por probabilidad descendente
        idx = np.argsort(p)[::-1]
        sorted_bp = self.cal_bp[idx]
        sorted_p  = p[idx]

        cumsum = np.cumsum(sorted_p)
        cumsum = cumsum / cumsum[-1]

        # Índices dentro del HPD
        mask = cumsum <= prob
        selected_bp = np.sort(sorted_bp[mask])

        # 🔥 Agrupar intervalos contiguos (más fino que antes)
        intervals = []
        if len(selected_bp) == 0:
            return intervals

        start = selected_bp[0]
        prev  = selected_bp[0]

        for val in selected_bp[1:]:
            if val - prev <= 1:  # 🔥 resolución anual
                prev = val
            else:
                intervals.append((start, prev))
                start = val
                prev  = val

        intervals.append((start, prev))

        return intervals

    def summary(self) -> dict:
        p = self.probability.copy()

        # 🔥 Normalización correcta
        area = np.trapezoid(p, self.cal_bp)
        if area > 0:
            p = p / area

        bcad = self.to_bcad()

        # 🔥 Mediana robusta (tipo rcarbon)
        cdf = np.cumsum(p)
        cdf = cdf / cdf[-1]

        median_idx = np.searchsorted(cdf, 0.5)
        median_bcad = float(bcad[median_idx])

        def bp_to_bcad(intervals):
            return [
                (round(1950 - end), round(1950 - start))
                for start, end in intervals
            ]

        return {
            "sample_id"  : self.sample_id,
            "bp"         : self.bp,
            "sd"         : self.sd,
            "median_bcad": round(median_bcad),
            "hpd_1sigma" : bp_to_bcad(self.hpd(0.683)),
            "hpd_2sigma" : bp_to_bcad(self.hpd(0.954)),
            "curve"      : self.curved_name,
        }


# ---------------------------------------------------------------------------
# Carga de curva
# ---------------------------------------------------------------------------

def load_curve(curve_path: str | Path, interpolate: bool = True) -> pd.DataFrame:

    df = pd.read_csv(
        curve_path,
        comment="#",
        header=None,
        usecols=[0, 1, 2],
        names=["cal_bp", "c14_age", "sigma"],
    )

    df = df.sort_values("cal_bp").reset_index(drop=True)

    # 🔥 Interpolación para mayor resolución (clave tipo rcarbon)
    if interpolate:
        cal_bp_fine = np.arange(df.cal_bp.min(), df.cal_bp.max(), 1)

        c14_interp = np.interp(cal_bp_fine, df.cal_bp, df.c14_age)
        sigma_interp = np.interp(cal_bp_fine, df.cal_bp, df.sigma)

        df = pd.DataFrame({
            "cal_bp": cal_bp_fine,
            "c14_age": c14_interp,
            "sigma": sigma_interp
        })

    return df


# ---------------------------------------------------------------------------
# Calibración
# ---------------------------------------------------------------------------

def calibrate(
    bp,
    sd,
    curve: pd.DataFrame,
    sample_ids=None,
    res_offset: float = 0,
    res_error : float = 0,
    normalised: bool  = True,
):
    if isinstance(bp, (int, float)):
        bp = [bp]
    if isinstance(sd, (int, float)):
        sd = [sd]
    if sample_ids is None:
        sample_ids = [f"date_{i+1}" for i in range(len(bp))]
    elif isinstance(sample_ids, str):
        sample_ids = [sample_ids]

    cal_bp = curve["cal_bp"].values
    c14    = curve["c14_age"].values
    sigma  = curve["sigma"].values

    results = []

    for bp_val, sd_val, sid in zip(bp, sd, sample_ids):

        sd_total = np.sqrt(sd_val**2 + res_error**2 + sigma**2)
        diff = (bp_val + res_offset) - c14

        # Solo el exponente, igual que rcarbon
        prob = np.exp(-0.5 * (diff / sd_total) ** 2)

        if normalised:
            total = prob.sum()
            if total > 0:
                prob = prob / total

        results.append(CalibratedDate(
            sample_id   = sid,
            bp          = bp_val,
            sd          = sd_val,
            cal_bp      = cal_bp.copy(),
            probability = prob,
            curved_name = "intcal20",
        ))

    return results


if __name__ == "__main__":
    import sys
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    sys.path.insert(0, ".")
    from python_migration.data_loading import load_data

    curve_path = sys.argv[1] if len(sys.argv) > 1 else "database/curves/intcal20.14c"
    csv_path   = sys.argv[2] if len(sys.argv) > 2 else "database/Canarias.csv"

    # ------------------------------------------------------------------
    # Filtros por defecto de app.R — Panel 2 "Calibrar"
    # Solo los inputs del UI; BP y SD NO son filtros, vienen del CSV.
    #   Id-Muestra       : sort(filemaker$IdMuestra)[1] → "1A-1066"
    #   Curva calibración: "intcal20"  (primera opción selectInput)
    #   DeltaR           : 0           (value del numericInput)
    #   Error DeltaR     : 0           (value del numericInput)
    #   Normalizar (plot): "FALSE"     (primera opción selectInput)
    # ------------------------------------------------------------------
    ID_MUESTRA = "1A-1066"
    CURVA      = "intcal20"
    RES_OFFSET = 0
    RES_ERROR  = 0

    # BP, SD y demás datos vienen del CSV según IdMuestra seleccionada,
    # igual que datos() <- subset(filemaker, IdMuestra==input$Datacion, ...) en R
    df_all = load_data(csv_path)["all"]
    fila   = df_all[df_all["IdMuestra"] == ID_MUESTRA].iloc[0]
    BP         = int(fila["BP"])
    SD         = int(fila["SD"])
    YACIMIENTO = str(fila["Yacimiento"])

    curve = load_curve(curve_path)

    # ------------------------------------------------------------------
    # OUTPUT 1 — GRÁFICA
    # equiv. a output$calibrada en app.R (líneas 483-492):
    #   acalibrar <- calibrate(BP, SD, calCurves="intcal20",
    #                          resOffsets=0, resErrors=0, normalised="FALSE")
    #   plot(acalibrar, HPD=TRUE, calendar="BCAD", main=datos()$Yacimiento)
    #
    # rcarbon::plot.CalDates(HPD=TRUE, calendar="BCAD") dibuja con doble eje Y:
    #   Eje Y izquierdo (probabilidad):
    #     1. Polígono gris claro (grey82 ≈ #d1d1d1): probabilidad completa
    #     2. Polígono gris oscuro (grey50 ≈ #808080): regiones HPD 2σ sobre la curva
    #   Eje Y derecho (edad ¹⁴C BP):
    #     3. Banda + línea naranja: curva de calibración IntCal con incertidumbre
    #     4. Relleno + línea verde: distribución Gaussiana de la fecha sin calibrar
    # ------------------------------------------------------------------
    from scipy import stats as scipy_stats

    date_plot = calibrate(bp=BP, sd=SD, curve=curve, sample_ids=ID_MUESTRA,
                          res_offset=RES_OFFSET, res_error=RES_ERROR,
                          normalised=False)[0]

    bcad = date_plot.to_bcad()   # 1950 - cal_bp (orden descendente)
    prob = date_plot.probability
    mask_sig = prob > prob.max() * 0.0005
    bcad_sig = bcad[mask_sig]
    prob_sig = prob[mask_sig]

    # Límites del eje X: rango calibrado + margen 40%
    x_old    = float(bcad_sig[-1])       # extremo antiguo (izquierda)
    x_new    = float(bcad_sig[0])        # extremo reciente (derecha)
    margin   = (x_new - x_old) * 0.4
    xlim_lo  = x_old - margin
    xlim_hi  = x_new + margin

    # Rango del eje Y derecho: edad ¹⁴C en torno a la muestra
    c14_lo = BP - 6 * SD
    c14_hi = BP + 6 * SD

    fig, ax1 = plt.subplots(figsize=(10, 6))
    ax2 = ax1.twinx()
    ax1.set_xlim(xlim_lo, xlim_hi)
    ax2.set_ylim(c14_lo, c14_hi)

    # ── Eje derecho: curva de calibración (naranja) ───────────────────
    # Filtrar curva al rango visible en x (con margen adicional)
    cal_lo = max(0,     int(1950 - xlim_hi) - 50)
    cal_hi = min(55000, int(1950 - xlim_lo) + 50)
    cmask  = (curve["cal_bp"] >= cal_lo) & (curve["cal_bp"] <= cal_hi)
    csub   = curve[cmask]
    cx     = 1950 - csub["cal_bp"].values    # BC/AD (descendente)
    cy     = csub["c14_age"].values
    cs     = csub["sigma"].values

    ax2.fill_between(cx, cy - 2*cs, cy + 2*cs,
                     color="orange", alpha=0.15, zorder=1)
    ax2.plot(cx, cy, color="orange", linewidth=1.5, alpha=0.75, zorder=2)

    # ── Eje derecho: Gaussiana de la fecha sin calibrar (verde) ───────
    # Distribución normal centrada en BP±SD, mostrada en el margen derecho.
    # x: xlim_hi → xlim_hi - gauss_width (probabilidad máx. = más a la izquierda)
    # y (eje derecho): edad ¹⁴C BP
    c14_g    = np.linspace(c14_lo, c14_hi, 400)
    gauss_p  = scipy_stats.norm.pdf(c14_g, loc=BP, scale=SD)
    gauss_p  = gauss_p / gauss_p.max()            # normalizar a [0, 1]
    g_width  = (xlim_hi - xlim_lo) * 0.18         # 18 % del ancho del eje X
    gauss_x  = xlim_hi - gauss_p * g_width        # x decrece con la probabilidad

    ax2.fill_betweenx(c14_g, xlim_hi, gauss_x,
                      color="#90ee90", alpha=0.45, zorder=3)
    ax2.plot(gauss_x, c14_g, color="#228b22", linewidth=1.5, alpha=0.85, zorder=4)
    ax2.set_ylabel("Radiocarbon age (¹⁴C BP)")

    # ── Eje izquierdo: probabilidad calibrada ─────────────────────────
    # Toda la distribución en gris claro (grey82 ≈ #d1d1d1)
    ax1.fill_between(bcad_sig, prob_sig, color="#d1d1d1", zorder=5)

    # Regiones HPD 2σ sobreimpresas en gris oscuro (grey50 ≈ #808080)
    for start_bp, end_bp in date_plot.hpd(0.954):
        x0 = float(1950 - end_bp)    # extremo antiguo
        x1 = float(1950 - start_bp)  # extremo reciente
        hpd_m = (bcad_sig >= x0) & (bcad_sig <= x1)
        ax1.fill_between(bcad_sig, 0, prob_sig, where=hpd_m,
                         color="#808080", zorder=6)

    ax1.plot(bcad_sig, prob_sig, color="black", linewidth=0.8, zorder=7)
    ax1.axhline(0, color="black", linewidth=0.5)
    ax1.set_xlim(xlim_lo, xlim_hi)
    ax1.set_xlabel("cal BC/AD")
    ax1.set_ylabel("Probability density")
    ax1.set_title(YACIMIENTO)
    ax1.set_ylim(bottom=0)
    ax1.legend(handles=[
        mpatches.Patch(color="#808080", label="2σ HPD (95.4%)"),
        mpatches.Patch(color="#d1d1d1", label="Calibrated prob."),
        plt.Line2D([0], [0], color="orange",  linewidth=2, label="Calibration curve"),
        plt.Line2D([0], [0], color="#228b22", linewidth=2, label="¹⁴C date (Gaussian)"),
    ], loc="upper left", fontsize=9)
    plt.tight_layout()
    plt.savefig("calibration_panel2_test.png", dpi=150)
    plt.show()

    # ------------------------------------------------------------------
    # OUTPUT 2 — TABLA información principal de la fecha
    # equiv. a output$ver_informacion en app.R (líneas 505-516):
    #   subset(filemaker, IdMuestra==input$Datacion,
    #          c("Yacimiento","Isla","IdMuestra","BP","SD","Higiene",
    #            "Contexto_Est","Vida","Material","Especie","Adscripcion",
    #            "Referencia","Id_BibTeX"))
    # ------------------------------------------------------------------
    INFO_COLS   = ["Yacimiento", "Isla", "IdMuestra", "BP", "SD", "Higiene",
                   "Contexto_Est", "Vida", "Material", "Especie",
                   "Adscripcion", "Referencia", "Id_BibTeX"]
    cols_ok     = [c for c in INFO_COLS if c in df_all.columns]
    info_tabla  = df_all[df_all["IdMuestra"] == ID_MUESTRA][cols_ok]

    print("\nInformación principal fecha calibrada")
    print("=" * 70)
    print(info_tabla.to_string(index=False))
    print()

    # ------------------------------------------------------------------
    # OUTPUT 3 — TEXTO tabla de calibración
    # equiv. a output$summary_cal en app.R (líneas 495-501):
    #   dataset <- calibrate(BP, SD)          # normalised=TRUE por defecto
    #   datasum <- summary(dataset, calendar="BCAD")
    #   pandoc.table(datusuma, caption=" Media y calibración a 1 / 2 sigmas")
    # ------------------------------------------------------------------
    date_sum = calibrate(bp=BP, sd=SD, curve=curve, sample_ids=ID_MUESTRA,
                         normalised=True)[0]
    s = date_sum.summary()

    sigma1 = "  /  ".join(f"{a} to {b}" for a, b in s["hpd_1sigma"])
    sigma2 = "  /  ".join(f"{a} to {b}" for a, b in s["hpd_2sigma"])

    print("Tabla de calibración — Media y calibración a 1 / 2 sigmas")
    print("=" * 58)
    print(f"  {'Muestra':<12} {'Mediana':>10}  {'1σ (68.3%)':<30}  {'2σ (95.4%)'}")
    print(f"  {'-'*12} {'-'*10}  {'-'*30}  {'-'*30}")
    print(f"  {s['sample_id']:<12} {str(s['median_bcad']) + ' BC/AD':>10}  {sigma1:<30}  {sigma2}")