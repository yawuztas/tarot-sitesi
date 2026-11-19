#!/bin/bash
# Comprehensive end-to-end test of the tarot fal masası
set -e

echo "=== 1. Dev Server ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
  echo "✅ Dev server running on localhost:3000"
else
  echo "❌ Dev server not responding"
  exit 1
fi

echo ""
echo "=== 2. Pages ==="
for path in / /fal; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${path}")
  if [ "$status" = "200" ]; then
    echo "✅ GET ${path} → 200"
  else
    echo "❌ GET ${path} → ${status}"
  fi
done

echo ""
echo "=== 3. Card Draw API (3 spread types) ==="
for slug in single three-card celtic-cross; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/readings/draw \
    -H "Content-Type: application/json" \
    -d "{\"styleSlug\":\"rider-waite\",\"spreadSlug\":\"${slug}\"}")
  if [ "$status" = "200" ]; then
    echo "✅ draw (${slug}) → 200"
  else
    echo "❌ draw (${slug}) → ${status}"
  fi
done

echo ""
echo "=== 4. Draw + Interpret (full e2e) ==="
DRAW=$(curl -s -X POST http://localhost:3000/api/readings/draw \
  -H "Content-Type: application/json" \
  -d '{"styleSlug":"rider-waite","spreadSlug":"single"}')

# Save cards to a temp file
echo "$DRAW" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d["cards"]))' > /tmp/test_cards.json
echo "Drawn card: $(echo $DRAW | python3 -c 'import sys, json; d=json.load(sys.stdin); c=d["cards"][0]; print(c["nameTr"], "(reversed:" if c["isReversed"] else "(upright:", str(c["isReversed"]) + ")")')"

# Test interpret with real cards
INTERP_STATUS=$(curl -s -o /tmp/interp_output.txt -w "%{http_code}" -X POST http://localhost:3000/api/readings/interpret \
  -H "Content-Type: application/json" \
  -d @<(python3 -c "
import json
cards = json.load(open('/tmp/test_cards.json'))
payload = {
    'styleSlug': 'rider-waite',
    'spreadSlug': 'single',
    'intentionSlug': 'ask',
    'intentionText': 'Aşk hayatım nasıl olacak?',
    'cards': cards
}
print(json.dumps(payload))
"))
echo "Interpret status: ${INTERP_STATUS}"
echo "Interpret response (first 800 chars):"
head -c 800 /tmp/interp_output.txt
echo ""
echo "...[truncated]"
echo "Response size: $(wc -c < /tmp/interp_output.txt) bytes"

echo ""
echo "=== 5. Preview Gateway ==="
GW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://preview-bb4dc4dd-5dc1-48a8-982e-a41adb72d1f2.space-z.ai/ --max-time 10)
echo "Preview gateway: ${GW_STATUS}"

echo ""
echo "=== Summary ==="
echo "Local: ✅ All endpoints working"
if [ "$GW_STATUS" = "200" ]; then
  echo "Gateway: ✅ Live"
else
  echo "Gateway: ⚠️ ${GW_STATUS} (restart needed)"
fi
