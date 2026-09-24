import re

with open('src/components/VRScene.tsx', 'r') as f:
    content = f.read()

target = """        <!-- Left Wall Window -->
        <a-box position="-4.8 1.6 0" width="0.05" height="3.2" depth="8.4" color="#f8fafc" material="opacity: 0.15; transparent: true; roughness: 0.1; metalness: 0.8"></a-box>
        <!-- Suggestion of office behind -->
        <a-plane position="-6.0 1.6 0" rotation="0 90 0" width="8" height="3.2" color="#e2e8f0" material="shader: flat"></a-plane>
        <a-box position="-5.5 0.5 2" width="1" height="1" depth="2" color="#cbd5e1"></a-box>
        <a-box position="-5.5 1.5 -2" width="1" height="3" depth="0.5" color="#94a3b8"></a-box> <!-- Pillar -->
        <!-- Subtle plant suggestion -->
        <a-sphere position="-5.3 0.5 -1" radius="0.5" color="#4ade80" material="opacity: 0.8"></a-sphere>"""

replacement = """        <!-- Left Wall Window (Glass Architecture) -->
        <!-- Glass Pane -->
        <a-box position="-4.8 1.6 0" width="0.05" height="3.2" depth="8.4" color="#e0f2fe" material="opacity: 0.2; transparent: true; roughness: 0.05; metalness: 0.9"></a-box>
        
        <!-- Framing/Mullions for the glass -->
        <a-box position="-4.78 1.6 2" width="0.1" height="3.2" depth="0.1" color="#334155" material="metalness: 0.5; roughness: 0.5"></a-box>
        <a-box position="-4.78 1.6 -2" width="0.1" height="3.2" depth="0.1" color="#334155" material="metalness: 0.5; roughness: 0.5"></a-box>
        <a-box position="-4.78 1.6 0" width="0.1" height="3.2" depth="0.1" color="#334155" material="metalness: 0.5; roughness: 0.5"></a-box>
        
        <!-- Suggestion of premium office behind (blurred/abstracted) -->
        <!-- Back wall of the corridor (light and bright) -->
        <a-plane position="-7.0 1.6 0" rotation="0 90 0" width="10" height="3.2" color="#f1f5f9" material="shader: flat"></a-plane>
        
        <!-- Distant Abstract Workstations -->
        <a-box position="-6.0 0.4 3" width="1.5" height="0.8" depth="2" color="#cbd5e1" material="roughness: 0.9"></a-box>
        <a-box position="-6.0 0.4 -1" width="1.5" height="0.8" depth="2" color="#cbd5e1" material="roughness: 0.9"></a-box>
        
        <!-- Ambient Daylight coming from the corridor -->
        <a-light type="area" position="-6.5 2 0" intensity="0.5" color="#ffffff" width="4" height="2"></a-light>
        
        <!-- Abstract Ficus/Office Plants -->
        <a-entity position="-5.5 0.5 -3">
            <a-sphere radius="0.4" position="0 0.6 0" color="#166534" material="opacity: 0.9; roughness: 0.8"></a-sphere>
            <a-sphere radius="0.3" position="-0.2 0.8 0.2" color="#15803d" material="opacity: 0.8; roughness: 0.8"></a-sphere>
            <a-sphere radius="0.35" position="0.2 0.5 -0.2" color="#16a34a" material="opacity: 0.7; roughness: 0.8"></a-sphere>
            <a-cylinder radius="0.05" height="0.6" position="0 0 0" color="#78350f"></a-cylinder>
            <a-cylinder radius="0.4" height="0.3" position="0 -0.15 0" color="#e5e7eb"></a-cylinder> <!-- Modern Planter -->
        </a-entity>
        
        <a-entity position="-5.5 0.5 1.5">
            <a-sphere radius="0.5" position="0 0.7 0" color="#15803d" material="opacity: 0.85; roughness: 0.8"></a-sphere>
            <a-cylinder radius="0.06" height="0.7" position="0 0 0" color="#78350f"></a-cylinder>
            <a-cylinder radius="0.35" height="0.4" position="0 -0.2 0" color="#334155"></a-cylinder> <!-- Dark Planter -->
        </a-entity>"""

content = content.replace(target, replacement)

with open('src/components/VRScene.tsx', 'w') as f:
    f.write(content)
print("Updated Glass Wall")
