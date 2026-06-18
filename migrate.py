import json
import re

# Read the file
with open('d:/Documents/GitHub/DivinationTool/hex_interpretations.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the JSON-like object
match = re.search(r'const hexagramInterpretations = (\{.*?\});', content, re.DOTALL)
if match:
    # Use python to parse by doing some string replacement to make it valid JSON
    json_str = match.group(1)
    # It's actually almost valid JSON except keys might need double quotes, but they already have double quotes!
    data = json.loads(json_str)
    
    new_data = {}
    for k, v in data.items():
        # Split logic
        if '。事业' in v:
            parts = v.split('。事业')
            general = parts[0] + '。'
            rest = '事业' + parts[1]
            
            if '；感情' in rest:
                sub_parts = rest.split('；感情')
                career = sub_parts[0]
                love = '感情' + sub_parts[1]
            else:
                career = rest
                love = "顺其自然即可。"
                
            new_data[k] = {
                "general": general.strip(),
                "career": career.strip(),
                "love": love.strip()
            }
        else:
            new_data[k] = {
                "general": v,
                "career": "顺其自然。",
                "love": "顺其自然。"
            }
            
    # Write back
    new_js = "const hexagramInterpretations = " + json.dumps(new_data, ensure_ascii=False, indent=2) + ";\n"
    with open('d:/Documents/GitHub/DivinationTool/hex_interpretations.js', 'w', encoding='utf-8') as f:
        f.write(new_js)
    print("Successfully converted hex_interpretations.js")
else:
    print("Regex failed to find object")
