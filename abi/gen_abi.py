##!/usr/bin/env python3

import json
import os

ENTRY_POINT_ABI_FILENAME = "EntryPoint.abi"
DEX_MANAGER_ABI_FILENAME = "DexManager.abi"


def gen_abi():
    current_dir = os.path.dirname(os.path.realpath(__file__))
    contract_build_dir = os.path.join(
        current_dir,
        "..",
        "artifacts",
        "contracts",
    )

    entrypoint_build_json_file = os.path.join(
        contract_build_dir,
        "entrypoint",
        "AADexEntryPoint.sol",
        "AADexEntryPoint.json",
    )
    dexmanager_build_json_file = os.path.join(
        contract_build_dir,
        "aadex",
        "AADexManager.sol",
        "AADexManager.json",
    )

    with open(entrypoint_build_json_file, "r") as file:
        entrypoint_build_json = json.load(file)

    with open(dexmanager_build_json_file, "r") as file:
        dexmanager_build_json = json.load(file)

    entrypoint_abi_file = os.path.join(
        current_dir,
        ENTRY_POINT_ABI_FILENAME,
    )
    dexmanager_abi_file = os.path.join(
        current_dir,
        DEX_MANAGER_ABI_FILENAME,
    )

    # Create EntryPoint.abi
    with open(entrypoint_abi_file, "w") as file:
        json.dump(entrypoint_build_json["abi"], file, indent=2)

    # Create DexManager.abi
    with open(dexmanager_abi_file, "w") as file:
        json.dump(dexmanager_build_json["abi"], file, indent=2)


gen_abi()
