PACKAGE_ID := $(shell awk -F"'" '/id:/ {print $$2}' startos/manifest.ts)
INGREDIENTS := $(shell start-cli s9pk list-ingredients 2>/dev/null)

.PHONY: all aarch64 x86_64 riscv64 arm arm64 x86 riscv arch/* clean install check-deps check-init package ingredients
.DELETE_ON_ERROR:
.SECONDARY:

define SUMMARY
	@manifest=$$(start-cli s9pk inspect $(1) manifest); \
	size=$$(du -h $(1) | awk '{print $$1}'); \
	title=$$(printf '%s' "$$manifest" | jq -r .title); \
	version=$$(printf '%s' "$$manifest" | jq -r .version); \
	arches=$$(printf '%s' "$$manifest" | jq -r '[.images[].arch // []] | flatten | unique | join(", ")'); \
	sdkv=$$(printf '%s' "$$manifest" | jq -r .sdkVersion); \
	gitHash=$$(printf '%s' "$$manifest" | jq -r .gitHash | sed -E 's/(.*-modified)$$/\x1b[0;31m\1\x1b[0m/'); \
	printf "\n"; \
	printf "\033[1;32m✅ Build Complete!\033[0m\n"; \
	printf "\n"; \
	printf "\033[1;37m📦 $$title\033[0m   \033[36mv$$version\033[0m\n"; \
	printf "───────────────────────────────\n"; \
	printf " \033[1;36mFilename:\033[0m   %s\n" "$(1)"; \
	printf " \033[1;36mSize:\033[0m       %s\n" "$$size"; \
	printf " \033[1;36mArch:\033[0m       %s\n" "$$arches"; \
	printf " \033[1;36mSDK:\033[0m        %s\n" "$$sdkv"; \
	printf " \033[1;36mGit:\033[0m        %s\n" "$$gitHash"; \
	echo ""
endef

all: $(PACKAGE_ID).s9pk
	$(call SUMMARY,$<)

arch/%: $(PACKAGE_ID)_%.s9pk
	$(call SUMMARY,$<)

x86 x86_64: arch/x86_64
arm arm64 aarch64: arch/aarch64
riscv riscv64: arch/riscv64

$(PACKAGE_ID).s9pk: $(INGREDIENTS) .git/HEAD .git/index
	@$(MAKE) --no-print-directory ingredients
	@echo "   Packing '$@'..."
	start-cli s9pk pack --arch=x86_64 --arch=aarch64 -o $@

$(PACKAGE_ID)_%.s9pk: $(INGREDIENTS) .git/HEAD .git/index
	@$(MAKE) --no-print-directory ingredients
	@echo "   Packing '$@'..."
	start-cli s9pk pack --arch=$* -o $@

ingredients: $(INGREDIENTS)
	@echo "   Re-evaluating ingredients..."
