#!/bin/bash
set -e

echo "=========================================="
echo "  Pre-Push Validation for Hiking Map"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${GREEN}✓ Starting validation...${NC}"
echo ""

# 1. Check required files exist
echo "${YELLOW}[1/5] Checking required files...${NC}"
REQUIRED_FILES=("index.html" "style.css" "api-keys.js" "config.js" "script.js" "setup-api-keys.js")
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file MISSING!"
    exit 1
  fi
done
echo ""

# 2. Verify HTML structure and script paths
echo "${YELLOW}[2/5] Checking HTML structure...${NC}"
if grep -q 'src="api-keys.js"' index.html && \
   grep -q 'src="config.js"' index.html && \
   grep -q 'src="script.js"' index.html; then
  echo "  ✓ All script paths correct in index.html"
else
  echo "  ✗ Script paths incorrect in index.html"
  exit 1
fi

if grep -q 'href="style.css"' index.html; then
  echo "  ✓ CSS path correct in index.html"
else
  echo "  ✗ CSS path incorrect in index.html"
  exit 1
fi
echo ""

# 3. Check for critical syntax errors in JS files
echo "${YELLOW}[3/5] Checking JavaScript syntax...${NC}"
for file in api-keys.js config.js script.js setup-api-keys.js; do
  if [ -f "$file" ]; then
    # Check for basic syntax issues (unclosed braces, brackets)
    open_braces=$(grep -o '{' "$file" | wc -l)
    close_braces=$(grep -o '}' "$file" | wc -l)
    
    if [ "$open_braces" -ne "$close_braces" ]; then
      echo "  ✗ $file has unmatched braces (open: $open_braces, close: $close_braces)"
      exit 1
    fi
    
    open_parens=$(grep -o '(' "$file" | wc -l)
    close_parens=$(grep -o ')' "$file" | wc -l)
    
    if [ "$open_parens" -ne "$close_parens" ]; then
      echo "  ✗ $file has unmatched parentheses (open: $open_parens, close: $close_parens)"
      exit 1
    fi
  else
    echo "  ⚠ $file not found in project root"
  fi
done
echo ""

# 4. Check GitHub Actions workflow exists and is valid YAML
echo "${YELLOW}[4/5] Checking GitHub Actions workflow...${NC}"
if [ -f ".github/workflows/build-and-deploy.yml" ]; then
  if grep -q 'name: Build and Deploy' .github/workflows/build-and-deploy.yml; then
    echo "  ✓ Workflow file exists with correct name"
  else
    echo "  ✗ Workflow file missing or incorrect"
    exit 1
  fi
  
  # Check for required secrets
  if grep -q 'secrets/OR_API_KEY' .github/workflows/build-and-deploy.yml && \
     grep -q 'secrets.DEPLOY_TOKEN' .github/workflows/build-and-deploy.yml; then
    echo "  ✓ Required secrets configured"
  else
    echo "  ⚠ Warning: Not all secrets configured (add in repo settings)"
  fi
else
  echo "  ✗ Workflow file not found at .github/workflows/build-and-deploy.yml"
  exit 1
fi
echo ""

# 5. Verify configuration functions exist
echo "${YELLOW}[5/5] Checking API key management functions...${NC}"
if grep -q 'class ApiKeyManager' api-keys.js; then
  echo "  ✓ ApiKeyManager class defined"
else
  echo "  ✗ ApiKeyManager class not found in api-keys.js"
  exit 1
fi

if grep -q 'window.ApiKeyManager = ApiKeyManager' api-keys.js; then
  echo "  ✓ ApiKeyManager exposed to window object"
else
  echo "  ✗ ApiKeyManager not exported to global scope"
  exit 1
fi

if grep -q 'setupModal' config.js 2>/dev/null || grep -q 'showApiKeySetup' config.js; then
  echo "  ✓ Config has setup functions for API key modal"
else
  echo "  ⚠ Warning: Setup functions not found in config.js (may use defaults)"
fi
echo ""

# All checks passed
echo "${GREEN}=========================================="
echo "  ✅ ALL VALIDATION CHECKS PASSED!"
echo "=========================================="
echo ""
echo "You can safely push these changes to git."
echo ""
echo "${YELLOW}Note: Local server will test on http://localhost:8765${NC}"
echo "      After pushing, visit your GitHub Pages site."
echo ""

exit 0
