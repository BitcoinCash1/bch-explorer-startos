ARCHES ?= x86 arm riscv
# overrides to s9pk.mk must precede the include statement
# Use the SDK's build rules rather than a vendored copy — a stale local s9pk.mk
# drifts from start-cli and breaks packing (this repo hit
# "cannot filter out unhashed file icon.ico" with an April copy).
include node_modules/@start9labs/start-sdk/s9pk.mk
