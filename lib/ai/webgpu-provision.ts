import type { AiError } from "./contracts.ts";

export type WebGpuStatus = "idle" | "downloading" | "ready" | "error" | "cancelled";

export interface WebGpuProvisionState {
  available: boolean;
  optedIn: boolean;
  status: WebGpuStatus;
  progress: number;
  text: string;
  error: { code: AiError["code"]; message: string } | null;
}

export function probeWebGpu(): boolean {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

const listeners = new Set<() => void>();
let probed = false;
let state: WebGpuProvisionState = {
  available: false,
  optedIn: false,
  status: "idle",
  progress: 0,
  text: "",
  error: null,
};

function emit() {
  for (const listener of listeners) listener();
}

function setState(partial: Partial<WebGpuProvisionState>) {
  state = { ...state, ...partial };
  emit();
}

export function subscribeWebGpuProvision(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWebGpuProvisionState(): WebGpuProvisionState {
  if (!probed) {
    probed = true;
    state = { ...state, available: probeWebGpu() };
  }
  return state;
}

export const WEBGPU_PROVISION_SERVER: WebGpuProvisionState = Object.freeze({
  available: false,
  optedIn: false,
  status: "idle",
  progress: 0,
  text: "",
  error: null,
});

export function optInWebGpu(): void {
  setState({ optedIn: true });
}

export function reportWebGpuProgress(report: { progress: number; text: string }): void {
  setState({
    status: "downloading",
    progress: Math.min(1, Math.max(0, report.progress)),
    text: report.text,
  });
}

export function setWebGpuReady(): void {
  setState({ status: "ready", progress: 1, text: "The in-browser model is ready on this device." });
}

export function setWebGpuError(error: { code: AiError["code"]; message: string }): void {
  setState({ status: "error", error });
}

export function cancelWebGpuDownload(): void {
  setState({ status: "cancelled", progress: 0, text: "Download cancelled. It will resume or restart when you try again." });
}

export function resetWebGpuProvision(): void {
  probed = false;
  state = { available: false, optedIn: false, status: "idle", progress: 0, text: "", error: null };
  emit();
}