import { pairScreen } from "./api";
import { API_BASE } from "./config";
import { log } from "./logger";
import { saveSession } from "./session";

/**
 * En un PC con varios monitores, el shell de Electron carga esta página con
 * ?displayLabel=N según la posición física del monitor (de izquierda a
 * derecha). Sirve para que el instalador sepa, con solo mirar, qué código de
 * emparejamiento le corresponde a cada pantalla.
 */
function getDisplayLabel(): string | null {
  return new URLSearchParams(location.search).get("displayLabel");
}

export function renderPairingForm(container: HTMLElement, onPaired: () => void): void {
  const displayLabel = getDisplayLabel();

  container.innerHTML = `
    <div class="pairing">
      <form id="pairing-form">
        ${displayLabel ? `<div class="display-badge">Pantalla ${displayLabel}</div>` : ""}
        <h1>Emparejar pantalla</h1>
        <label for="pairing-code">Código de 6 dígitos</label>
        <input id="pairing-code" type="text" maxlength="6" inputmode="numeric" placeholder="000000" autofocus />
        <button type="submit">Emparejar</button>
        <p class="error" id="pairing-error"></p>
      </form>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#pairing-form")!;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = container.querySelector<HTMLInputElement>("#pairing-code")!.value.trim();
    const errorEl = container.querySelector<HTMLElement>("#pairing-error")!;
    errorEl.textContent = "";

    if (!/^\d{6}$/.test(code)) {
      errorEl.textContent = "El código debe tener 6 dígitos.";
      return;
    }

    try {
      const result = await pairScreen(API_BASE, code);
      saveSession({
        apiBase: API_BASE,
        screenId: result.screenId,
        token: result.token,
        pollingIntervalSeconds: result.pollingIntervalSeconds,
      });
      log("Emparejado correctamente");
      onPaired();
    } catch (err) {
      errorEl.textContent = (err as Error).message;
    }
  });
}
