import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from scipy.cluster.hierarchy import fcluster, linkage
from spd import spd as calc_spd, running_mean
from calibration import calibrate as cal_dates

# ---------------------------------------------------------------------------
# bin_prep — equivalente de binPrep()
# ---------------------------------------------------------------------------

def bin_prep(
    sites : list[str],
    ages  : list[float],
    h     : float = 50,
) -> list[str]:
    
    # Limpiar espacios
    sites = [s.strip() for s in sites]
    ages  = list(ages)
    bins  = [""] * len(sites)

    for site in set(sites):
        idx = [i for i, s in enumerate(sites) if s == site]

        if len(idx) == 1:
            bins[idx[0]] = f"{site}_1"
        else:
            ages_site = np.array([ages[i] for i in idx]).reshape(-1, 1)
            Z         = linkage(ages_site, method="complete")
            labels    = fcluster(Z, t=h, criterion="distance")
            for i, label in zip(idx, labels):
                bins[i] = f"{site}_{label}"

    return bins


# ---------------------------------------------------------------------------
# Dataclass de resultado de modelTest
# ---------------------------------------------------------------------------

@dataclass
class ModelTestResult:
    
    cal_bp       : np.ndarray
    spd_obs      : np.ndarray
    envelope_hi  : np.ndarray
    envelope_lo  : np.ndarray
    envelope_mid : np.ndarray
    positive_dev : np.ndarray
    negative_dev : np.ndarray
    model        : str
    time_range   : tuple[int, int]

    def to_bcad(self) -> np.ndarray:
        return 1950 - self.cal_bp


# ---------------------------------------------------------------------------
# Modelos teóricos de crecimiento
# ---------------------------------------------------------------------------

def _fit_model(
    cal_bp     : np.ndarray,
    spd_obs    : np.ndarray,
    model      : str,
) -> np.ndarray:
    
    # t=0 es el pasado, t=max es el presente (igual que rcarbon)
    t = cal_bp.max() - cal_bp  # ← cambio respecto a la versión anterior

    if model == "uniform":
        fitted = np.ones(len(cal_bp))

    elif model == "linear":
        coeffs = np.polyfit(t, spd_obs, 1)
        fitted = np.polyval(coeffs, t)
        fitted = np.maximum(fitted, 0)

    elif model == "exponential":
        spd_safe = np.maximum(spd_obs, 1e-10)
        coeffs   = np.polyfit(t, np.log(spd_safe), 1)
        fitted   = np.exp(np.polyval(coeffs, t))
        fitted   = np.maximum(fitted, 0)

    else:
        raise ValueError(f"Modelo no reconocido: {model}.")

    total = fitted.sum()
    if total > 0:
        fitted = fitted / total

    return fitted


# ---------------------------------------------------------------------------
# model_test — equivalente de modelTest()
# ---------------------------------------------------------------------------

def model_test(
    calibrated  : list,
    errors      : list[float],
    bins        : list[str],
    curve       : pd.DataFrame,
    nsim        : int   = 100,
    time_range  : tuple[int, int] = (2500, 250),
    model       : str   = "exponential",
    run_mean    : int   = 50,
    normalised  : bool  = False,
) -> ModelTestResult:
    
    start_bp, end_bp = max(time_range), min(time_range)

    # -------------------------------------------------------------------
    # 1. SPD observado con binning
    # -------------------------------------------------------------------
    # Seleccionar una fecha representativa por bin (la mediana de BP)
    bin_dict = {}
    for i, (b, err) in enumerate(zip(bins, errors)):
        if b not in bin_dict:
            bin_dict[b] = {"dates": [], "errors": [], "idx": []}
        bin_dict[b]["dates"].append(calibrated[i])
        bin_dict[b]["errors"].append(err)
        bin_dict[b]["idx"].append(i)

    # Una fecha calibrada por bin → SPD observado
    rep_dates = [v["dates"][0] for v in bin_dict.values()]

    spd_obs_result  = calc_spd(rep_dates, time_range=time_range, normalise=True)
    cal_bp          = spd_obs_result.cal_bp
    spd_obs_smooth  = running_mean(spd_obs_result, window=run_mean)

    # -------------------------------------------------------------------
    # 2. Ajustar modelo teórico al SPD observado
    # -------------------------------------------------------------------
    fitted_model = _fit_model(cal_bp, spd_obs_smooth, model)

    # -------------------------------------------------------------------
    # 3. Simulaciones Monte Carlo
    # -------------------------------------------------------------------
    # Número de bins (n simulaciones por iteración = n_bins)
    n_bins = len(bin_dict)
    errors_arr = np.array(errors)

    sim_matrix = np.zeros((nsim, len(cal_bp)))

    print(f"Ejecutando {nsim} simulaciones Monte Carlo...")

    for sim_i in range(nsim):
        # Muestrear n_bins fechas del modelo teórico
        # Método 'calsample': muestrear en años calendario y luego calibrar
        # Igual que Timpson et al. 2014 (método por defecto en rcarbon)

        # Muestrear años calendario del modelo teórico (ponderado por fitted_model)
        sampled_cal_bp = np.random.choice(cal_bp, size=n_bins, p=fitted_model)

        # Convertir a BP usando la curva de calibración (back-calibration)
        c14_age   = np.interp(sampled_cal_bp, curve["cal_bp"].values, curve["c14_age"].values)
        c14_sigma = np.interp(sampled_cal_bp, curve["cal_bp"].values, curve["sigma"].values)

        # Añadir error de medida (muestrear errores reales aleatoriamente)
        sampled_errors = np.random.choice(errors_arr, size=n_bins, replace=True)
        bp_sim = c14_age + np.random.normal(0, sampled_errors)

        # Calibrar las fechas simuladas
        sim_cal = cal_dates(
            bp         = bp_sim.tolist(),
            sd         = sampled_errors.tolist(),
            curve      = curve,
            normalised = normalised,
        )

        # SPD de las fechas simuladas
        sim_spd = calc_spd(sim_cal, time_range=time_range, normalise=True)
        sim_smooth = running_mean(sim_spd, window=run_mean)
        sim_matrix[sim_i, :] = sim_smooth

        if (sim_i + 1) % 10 == 0:
            print(f"  Simulación {sim_i + 1}/{nsim}")

    print(f"\nDiagnóstico simulaciones:")
    print(f"  cal_bp rango: {cal_bp.min():.0f} – {cal_bp.max():.0f}")
    print(f"  fitted_model sum: {fitted_model.sum():.4f}")
    print(f"  fitted_model max en cal_bp: {cal_bp[np.argmax(fitted_model)]:.0f}")
    print(f"  sim_matrix max medio: {sim_matrix.mean(axis=0).max():.6f}")
    print(f"  sim_matrix max en cal_bp: {cal_bp[np.argmax(sim_matrix.mean(axis=0))]:.0f}")
    
    # -------------------------------------------------------------------
    # 4. Calcular envelope de confianza al 95%
    # -------------------------------------------------------------------
    envelope_hi  = np.percentile(sim_matrix, 97.5, axis=0)
    envelope_lo  = np.percentile(sim_matrix,  2.5, axis=0)
    envelope_mid = np.percentile(sim_matrix, 50.0, axis=0)

    # -------------------------------------------------------------------
    # 5. Detectar desviaciones significativas
    # -------------------------------------------------------------------
    positive_dev = spd_obs_smooth > envelope_hi
    negative_dev = spd_obs_smooth < envelope_lo

    return ModelTestResult(
        cal_bp       = cal_bp,
        spd_obs      = spd_obs_smooth,
        envelope_hi  = envelope_hi,
        envelope_lo  = envelope_lo,
        envelope_mid = envelope_mid,
        positive_dev = positive_dev,
        negative_dev = negative_dev,
        model        = model,
        time_range   = (start_bp, end_bp),
    )


# ---------------------------------------------------------------------------
# Bloque de prueba
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    import matplotlib.pyplot as plt
    sys.path.insert(0, ".")
    from python_migration.calibration import load_curve, calibrate
    from python_migration.data_loading import load_data, filter_by_island

    curve_path = sys.argv[1] if len(sys.argv) > 1 else "database/curves/intcal20.14c"
    csv_path   = sys.argv[2] if len(sys.argv) > 2 else "database/Canarias.csv"

    print("Cargando datos...")
    datasets  = load_data(csv_path)
    curve     = load_curve(curve_path)

    # Valores por defecto del Panel 5 en app.R:
    # Isla: primera de la lista, modelo: exponential
    # timeRange: 2500-250, binning: 50, runm: 50, nsim: 2
    island_df = filter_by_island(datasets["analysis"], "Gran Canaria")

    print(f"Fechas en Gran Canaria: {len(island_df)}")

    # bin_prep
    bins = bin_prep(
        sites = island_df["Yacimiento"].tolist(),
        ages  = island_df["BP"].tolist(),
        h     = 50,
    )
    print(f"Bins generados: {len(set(bins))}")

    # calibrate con normalised=FALSE (igual que rcarbon en modelTest)
    calibrated = calibrate(
        bp         = island_df["BP"].tolist(),
        sd         = island_df["SD"].tolist(),
        curve      = curve,
        normalised = False,
    )

    # model_test con nsim=2 (valor por defecto en la app R)
    result = model_test(
        calibrated = calibrated,
        errors     = island_df["SD"].tolist(),
        bins       = bins,
        curve      = curve,
        nsim       = 2,
        time_range = (2500, 250),
        model      = "exponential",
        run_mean   = 50,
    )

    bcad = result.to_bcad()

    # --- Gráfica 1: SPD + envelope ---
    fig, ax = plt.subplots(figsize=(10, 5))

    ax.fill_between(result.cal_bp, result.envelope_lo, result.envelope_hi,
                    color="lightgrey", alpha=0.8, label="Confidence")
    ax.fill_between(result.cal_bp, result.envelope_lo, result.envelope_hi,
                    where=result.positive_dev,
                    color="indianred", alpha=0.5, label="Positive Dev.")
    ax.fill_between(result.cal_bp, result.envelope_lo, result.envelope_hi,
                    where=result.negative_dev,
                    color="royalblue", alpha=0.5, label="Negative Dev.")
    ax.plot(result.cal_bp, result.spd_obs, color="black", linewidth=1, label="SPD")
    ax.plot(result.cal_bp, result.envelope_mid, color="red", linewidth=1,
            linestyle="--", label="Model fit")

    # Eje X igual que R: cal BP, invertido (pasado → presente)
    ax.invert_xaxis()
    ax.set_xlabel("Years cal BP")
    ax.set_ylabel("Summed Probability")
    ax.set_title("Testeo contra modelos de crecimiento teóricos")
    ax.legend(ncol=2)
    plt.tight_layout()
    plt.savefig("paleodem_panel5_spd.png", dpi=150)
    plt.show()

    # --- Gráfica 2: ROC + envelope ---
    # Calcular ROC para las simulaciones también
    roc_obs = np.diff(result.spd_obs) / np.maximum(result.spd_obs[:-1], 1e-10)
    roc_obs = np.append(roc_obs, 0)

    # ROC del envelope
    roc_hi = np.diff(result.envelope_hi) / np.maximum(result.envelope_hi[:-1], 1e-10)
    roc_hi = np.append(roc_hi, 0)
    roc_lo = np.diff(result.envelope_lo) / np.maximum(result.envelope_lo[:-1], 1e-10)
    roc_lo = np.append(roc_lo, 0)

    roc_pos = roc_obs > roc_hi
    roc_neg = roc_obs < roc_lo

    fig, ax = plt.subplots(figsize=(10, 5))

    ax.fill_between(result.cal_bp, roc_lo, roc_hi,
                    color="lightgrey", alpha=0.8, label="Confidence")
    ax.fill_between(result.cal_bp, roc_lo, roc_hi,
                    where=roc_pos, color="indianred", alpha=0.5, label="Positive Dev.")
    ax.fill_between(result.cal_bp, roc_lo, roc_hi,
                    where=roc_neg, color="royalblue", alpha=0.5, label="Negative Dev.")
    ax.plot(result.cal_bp, roc_obs, color="black", linewidth=1, label="Crecimiento")
    ax.axhline(0, color="grey", linewidth=0.5, linestyle="--")

    ax.invert_xaxis()
    ax.set_xlabel("Years cal BP")
    ax.set_ylabel("Rate of Change")
    ax.set_title("Testeo de los ratios de crecimiento locales")
    ax.legend(ncol=2)
    plt.tight_layout()
    plt.savefig("paleodem_panel5_roc.png", dpi=150)
    plt.show()