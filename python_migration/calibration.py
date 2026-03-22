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

    curve_path = sys.argv[1] if len(sys.argv) > 1 else "database/curves/intcal20.14c"
    curve = load_curve(curve_path)

    results = calibrate(bp=1230, sd=30, curve=curve, sample_ids="Beta-539739")
    s = results[0].summary()

    print(f"MedianBC/AD: {s['median_bcad']}")
    print(f"\n1 sigma:")
    for start, end in s["hpd_1sigma"]:
        print(f"  {start} to {end}")
    print(f"\n2 sigma:")
    for start, end in s["hpd_2sigma"]:
        print(f"  {start} to {end}")