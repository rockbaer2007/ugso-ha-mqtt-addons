# Paket-Packer: erster Schritt

Der Kern prüft einen Quellordner mit `manifest.json` und optionalen Bildern unter `icons/` mit denselben Regeln wie der Studio-Importer. Er erzeugt `.wg`- oder `.tp`-Dateien, deren Inhalt ein ZIP ist. Ein vorhandenes Ziel wird nicht überschrieben.

```text
python ha_grafik_visual_studio/packer/core.py widget QUELLORDNER EXPORTORDNER --check
python ha_grafik_visual_studio/packer/core.py widget QUELLORDNER EXPORTORDNER
python ha_grafik_visual_studio/packer/core.py tool QUELLORDNER EXPORTORDNER
```

Der Exportordner muss bereits existieren. Die grafische Oberfläche, der Button **Endungen registrieren**, fertige Windows-/Linux-Programme und GitHub-Releases folgen in späteren Schritten.

## English

The core validates a source folder containing `manifest.json` and optional images under `icons/` using the same rules as the Studio importer. It exports ZIP-based `.wg` or `.tp` files without replacing an existing target. Use the commands above with `widget` or `tool`; `--check` validates without exporting. The destination directory must already exist. The graphical interface, file-extension registration, packaged Windows/Linux applications and releases are still planned.
