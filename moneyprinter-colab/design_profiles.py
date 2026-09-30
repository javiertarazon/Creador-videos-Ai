DESIGN_PROFILES = {
    "warm-editorial": {
        "label": "Editorial cálida",
        "description": "Fotografía editorial cálida, luz natural, encuadre íntimo y texturas sutiles.",
        "background": "#142523",
        "foreground": "#fff8eb",
        "accent": "#f1b751",
    },
    "tech-utility": {
        "label": "Tecnología precisa",
        "description": "Estética tecnológica sobria, luz fría controlada, composición limpia y alto contraste.",
        "background": "#101b2d",
        "foreground": "#f3f7ff",
        "accent": "#66d9e8",
    },
    "soft-warm": {
        "label": "Natural y serena",
        "description": "Tonos orgánicos suaves, luz de mañana, materiales naturales y atmósfera serena.",
        "background": "#29372b",
        "foreground": "#fff8e8",
        "accent": "#d7a86e",
    },
    "brutalist": {
        "label": "Urbana de alto contraste",
        "description": "Lenguaje visual urbano, encuadres geométricos, sombras gráficas y contraste marcado.",
        "background": "#191919",
        "foreground": "#fff9ed",
        "accent": "#ff6547",
    },
    "modern-minimal": {
        "label": "Minimal moderna",
        "description": "Composición minimalista, espacio negativo, formas claras y luz de estudio refinada.",
        "background": "#20232a",
        "foreground": "#fafafa",
        "accent": "#b9d887",
    },
}


def get_design_profile(profile_id: str) -> dict[str, str]:
    try:
        return DESIGN_PROFILES[profile_id].copy()
    except KeyError as exc:
        raise ValueError(f"Perfil visual desconocido: {profile_id}") from exc
