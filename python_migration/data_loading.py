import pandas as pd
from pathlib import Path

VALID_HYGIENE_LEVELS = {1, 2, 3, 4, 5, 6, 7}

BP_MAP_THRESHOLD = 3000

# ---------------------------------------------------------------------------
# Función principal de carga
# ---------------------------------------------------------------------------
def load_data(csv_path: str | Path) -> dict[str, pd.DataFrame]:

    csv_path = Path(csv_path)

    # Comprobamos que el archivo existe
    if not csv_path.exists():
        raise FileNotFoundError(f"No se encontró el CSV en: {csv_path}")
    
    #Leemos el csv
    df_all = pd.read_csv(csv_path, sep = ";", header = 0)

    # Quitamos los espacios en los nombres de las columnas
    df_all.columns = df_all.columns.str.strip() 

    #Nos aseguramos que BP, SD e Higiene sean numéricos
    for col in ['BP', "SD", 'Higiene']:
        if col in df_all.columns:
            df_all[col] = pd.to_numeric(df_all[col], errors = "coerce")

    df_map = df_all[df_all["BP"] <= BP_MAP_THRESHOLD].copy()

    df_analysis = df_all[df_all["Higiene"].isin(VALID_HYGIENE_LEVELS)].copy()

    return {
        "all": df_all,
        "map": df_map,
        "analysis": df_analysis,
    }

# ---------------------------------------------------------------------------
# Funciones de filtrado y selección
# ---------------------------------------------------------------------------

# Filtra por un umbral de BP
def filter_by_bp(df: pd.DataFrame, max_bp: int) -> pd.DataFrame:
    """Filtra el DataFrame por un umbral de BP."""
    return df[df["BP"] <= max_bp].copy()


def filter_by_sample_id(df: pd.DataFrame, sample_id: str) -> pd.DataFrame:

    mask = df["IdMuestra"] == sample_id
    return df.loc[mask, ["Yacimiento", "Isla", "BP", "SD"]].copy()

def filter_by_site(df: pd.DataFrame, site_name: str) -> pd.DataFrame:

    mask = df["Yacimiento"] == site_name
    return df.loc[mask, ["BP", "SD"]].copy()

def filter_by_island(df: pd.DataFrame, island_name: str) -> pd.DataFrame:
    cols = ["Yacimiento", "BP", "SD", "Vida", "Adscripcion", "Contexto_Est", "Material"]
    # Sólo incluir columnas que existan en el DataFrame
    cols_present = [c for c in cols if c in df.columns]
    mask = df["Isla"] == island_name
    return df.loc[mask, cols_present].copy()

# ---------------------------------------------------------------------------
# Funciones de consulta
# ---------------------------------------------------------------------------

# Devuelve una lista ordenadas muestras por ID
def get_sample_ids(df: pd.DataFrame) -> list[str]:
    return sorted(df["IdMuestra"].dropna().unique().tolist())
 
# Devuelve una lista ordenada de yacimientos
def get_site_names(df: pd.DataFrame) -> list[str]:
    return sorted(df["Yacimiento"].dropna().unique().tolist())
 
# Devuelve una lista ordenada de islas
def get_island_names(df: pd.DataFrame) -> list[str]:
    return sorted(df["Isla"].dropna().unique().tolist())

# ---------------------------------------------------------------------------
# Bloque de prueba rápida (ejecutar: python data_loader.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
 
    # Uso: python data_loader.py ruta/a/Canarias.csv
    path = sys.argv[1] if len(sys.argv) > 1 else "data/Canarias.csv"
 
    print(f"Cargando datos desde: {path}\n")
    datasets = load_data(path)
 
    for nombre, df in datasets.items():
        print(f"[{nombre}]  filas={len(df)}  columnas={list(df.columns)}")
 
    analysis = datasets["analysis"]
    print(f"\nIslas disponibles : {get_island_names(analysis)}")
    print(f"Yacimientos (primeros 5): {get_site_names(analysis)[:5]}")
    print(f"Muestras (primeras 5)   : {get_sample_ids(datasets['all'])[:5]}")
 
    print("\n--- Ejemplo filter_by_island('Gran Canaria') ---")
    gc = filter_by_island(analysis, "Gran Canaria")
    print(gc.head())