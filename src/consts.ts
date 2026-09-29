/**
 * Single source of truth for the release the site advertises.
 * Bump VERSION (and the sizes) after a new GitHub release and every
 * download link, filename and version badge on the site follows.
 */
export const VERSION = "1.1.2";

export const GITHUB = "https://github.com/solancer/sarala";
export const RELEASES = `${GITHUB}/releases`;
export const SNAP = "https://snapcraft.io/sarala";
export const DL = `${GITHUB}/releases/download/v${VERSION}`;

export type OsKey = "linux" | "mac" | "win";

export interface Build {
  label: string;
  file: string;
  size: string;
}

/** Primary download per platform, keyed by the OS-picker value. */
export const BUILDS: Record<OsKey, Build> = {
  linux: { label: "Linux", file: `Sarala_${VERSION}_amd64.AppImage`, size: "89.1 MB" },
  mac: { label: "macOS", file: `Sarala_${VERSION}_universal.dmg`, size: "27.5 MB" },
  win: { label: "Windows", file: `Sarala_${VERSION}_x64-setup.exe`, size: "12.1 MB" },
};

/** Secondary packages offered alongside the primary download. */
export const ALT = {
  deb: `Sarala_${VERSION}_amd64.deb`,
  rpm: `Sarala-${VERSION}-1.x86_64.rpm`,
  msi: `Sarala_${VERSION}_x64_en-US.msi`,
};

/** The app bundle name Gatekeeper sees once Sarala is in /Applications. */
export const MAC_APP_PATH = "/Applications/Sarala.app";
