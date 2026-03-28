import numpy as np
import pandas as pd
from dataclasses import dataclass
from calibration import CalibratedDate

@dataclass
class SPDResult:
    cal_bp      : np.array
    probability : np.array
    site        : str
    time_range  : tuple[int, int]
    n_dates     : int

    def to_bcad(self) -> np.array:
        return 1950 - self.cal_bp
    

# ---------------------------------------------------------------------------
# Función principal SPD
# ---------------------------------------------------------------------------
def spd(
    calibrated  : list[CalibratedDate],
    time_range  : tuple[int, int] = (2500, 250),
    site        : str = "",
    normalise   : bool = True,
) -> SPDResult:
    
    if len(calibrated) == 0:
        raise ValueError("La lista de fechas calibradas está vacía.")
    
    start_bp, end_bp = max(time_range), min(time_range)

    cal_bp_full = calibrated[0].cal_bp

    prob_sum = np.zeros(len(cal_bp_full))

    for date in calibrated:
        prob_sum += date.probability

    mask = (cal_bp_full >= end_bp) & (cal_bp_full <= start_bp)
    cal_bp_trimmed = cal_bp_full[mask]
    prob_trimmed = prob_sum[mask]

    if normalise:
        total = prob_trimmed.sum()
        if total > 0:
            prob_trimmed /= total

    return SPDResult(
        cal_bp = cal_bp_trimmed,
        probability = prob_trimmed,
        site = site,
        time_range = (start_bp, end_bp ),
        n_dates = len(calibrated),
    )


# ---------------------------------------------------------------------------
# Media móvil (suavizado)
# ---------------------------------------------------------------------------
def running_mean(spd_result: SPDResult, window: int = 50) -> np.ndarray:
    prob = spd_result.probability
    n    = len(prob)

    if window <= 1 or window >= n:
        return prob.copy()
    
    smoothed = np.convolve(prob, np.ones(window) / window, mode="same")
 
    # Corregir los bordes (convolve introduce artefactos en los extremos)
    half = window // 2
    for i in range(half):
        smoothed[i]        = prob[:i + half + 1].mean()
        smoothed[n-1-i]    = prob[n-i-half-1:].mean()
 
    return smoothed

def stack_spd(
    calibrated  : list[CalibratedDate],
    groups      : list[str],
    time_range  : tuple[int, int] = (2500, 250),
    normalise   : bool = True,
) -> dict[str, SPDResult]:
    # Calcula un SPD por cada categoría del grupo

    if len(calibrated) != len(groups):
        raise ValueError("calibrated y groups deben tener la misma longitud.")

    categorias = sorted(set(groups))
    resultado  = {}

    for categoria in categorias:
        fechas_cat = [
            c for c, g in zip(calibrated, groups)
            if g == categoria
        ]
        if len(fechas_cat) == 0:
            continue
        resultado[categoria] = spd(
            fechas_cat,
            time_range = time_range,
            site       = categoria,
            normalise  = normalise,
        )

    return resultado

# ---------------------------------------------------------------------------
# Bloque de prueba
# ---------------------------------------------------------------------------
 
if __name__ == "__main__":
    import sys
    import matplotlib.pyplot as plt
    sys.path.insert(0, ".")
    from python_migration.calibration import load_curve, calibrate
    from python_migration.data_loading import load_data, filter_by_site, filter_by_island

    curve_path = sys.argv[1] if len(sys.argv) > 1 else "database/curves/intcal20.14c"
    csv_path   = sys.argv[2] if len(sys.argv) > 2 else "database/Canarias.csv"

    datasets = load_data(csv_path)
    curve    = load_curve(curve_path)

    # --- PANEL 3 ---
    print("Panel 3 — SPD por yacimiento (Acusa)")
    site_df    = filter_by_site(datasets["analysis"], "Acusa")
    calibrated = calibrate(
        bp         = site_df["BP"].tolist(),
        sd         = site_df["SD"].tolist(),
        curve      = curve,
        sample_ids = site_df["BP"].astype(str).tolist(),
    )
    result   = spd(calibrated, time_range=(2500, 250), site="Acusa")
    smoothed = running_mean(result, window=50)
    bcad     = result.to_bcad()

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.fill_between(bcad, result.probability, color="red", alpha=0.3)
    ax.plot(bcad, result.probability, color="red", linewidth=0.5)
    ax.plot(bcad, smoothed, color="blue", linewidth=2)
    ax.set_xlabel("Years AD/BC")
    ax.set_ylabel("Summed probability")
    ax.set_title("Acusa")
    ax.axhline(0, color="black", linewidth=0.5)
    plt.tight_layout()
    plt.savefig("spd_panel3_test.png", dpi=150)
    plt.show()

    # --- PANEL 4 ---
    print("Panel 4 — SPD por unidad geográfica (El Hierro, por Vida)")
    island_df = filter_by_island(datasets["analysis"], "El Hierro")
    calibrated_isla = calibrate(
        bp         = island_df["BP"].tolist(),
        sd         = island_df["SD"].tolist(),
        curve      = curve,
        sample_ids = island_df["BP"].astype(str).tolist(),
    )

    groups    = island_df["Vida"].tolist()
    resultado = stack_spd(calibrated_isla, groups, time_range=(2500, 250), normalise=False)

    # Ordenar: Larga arriba, Corta abajo (igual que R)
    categorias = ["Larga", "Corta"]
    categorias = [c for c in categorias if c in resultado]
    n_cats     = len(categorias)

    fig, axes = plt.subplots(n_cats, 1, figsize=(10, 4 * n_cats), sharex=True, sharey=True)
    if n_cats == 1:
        axes = [axes]

    for ax, categoria in zip(axes, categorias):
        spd_cat  = resultado[categoria]
        bcad_cat = spd_cat.to_bcad()

        prob = spd_cat.probability

        ax.fill_between(bcad_cat, prob, alpha=0.5)
        ax.plot(bcad_cat, prob, linewidth=0.8)
        ax.set_title(categoria)
        ax.set_ylabel("Summed Probability")
        ax.axhline(0, color="black", linewidth=0.5)
        ax.invert_xaxis()

    axes[-1].set_xlabel("Years BC/AD")
    plt.suptitle("Gran Canaria — SPD por Vida", fontsize=13)
    plt.tight_layout()
    plt.savefig("spd_panel4_test.png", dpi=150)
    plt.show()