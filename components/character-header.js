class CustomCharacterHeader extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .header {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(124, 58, 237, 0.5);
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
        }
        .input-field {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(124, 58, 237, 0.3);
          transition: all 0.3s ease;
        }
        .input-field:focus {
          border-color: rgba(167, 139, 250, 0.7);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.5);
        }
      </style>
      <div class="header p-6 rounded-lg">
        <form id="character-form">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-1 text-violet-300">Nome do Personagem</label>
              <input type="text" id="character-name" 
                     class="input-field w-full px-4 py-2 rounded text-white placeholder-gray-500" 
                     placeholder="Ex: Eldrin Shadowmoon">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1 text-violet-300">Classe e Nível</label>
                <input type="text" id="class-level" 
                       class="input-field w-full px-4 py-2 rounded text-white placeholder-gray-500" 
                       placeholder="Ex: Mago 5">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-violet-300">Raça</label>
                <input type="text" id="race" 
                       class="input-field w-full px-4 py-2 rounded text-white placeholder-gray-500" 
                       placeholder="Ex: Elfo">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-violet-300">Antecedente</label>
              <input type="text" id="background" 
                     class="input-field w-full px-4 py-2 rounded text-white placeholder-gray-500" 
                     placeholder="Ex: Acadêmico">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-violet-300">Aparência Básica</label>
              <input type="text" id="appearance" 
                     class="input-field w-full px-4 py-2 rounded text-white placeholder-gray-500" 
                     placeholder="Ex: Alto, magro, cabelos prateados">
            </div>
          </div>
          <div class="mt-6 flex justify-end">
            <button type="button" onclick="saveCharacterHeader()" 
                    class="bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded">
              Salvar Personagem
            </button>
          </div>
        </form>
      </div>
      
      <script>
        function saveCharacterHeader() {
          const characterData = {
            name: this.shadowRoot.getElementById('character-name').value,
            classLevel: this.shadowRoot.getElementById('class-level').value,
            race: this.shadowRoot.getElementById('race').value,
            background: this.shadowRoot.getElementById('background').value,
            appearance: this.shadowRoot.getElementById('appearance').value
          };
          
          const event = new CustomEvent('characterHeaderSubmit', {
            detail: characterData
          });
          document.dispatchEvent(event);
        }
      </script>
    `;
    
    // Load existing character data if available
    const characterData = JSON.parse(localStorage.getItem('characterData'));
    if (characterData && characterData.character) {
      this.shadowRoot.getElementById('character-name').value = characterData.character.name || '';
      this.shadowRoot.getElementById('class-level').value = characterData.character.classLevel || '';
      this.shadowRoot.getElementById('race').value = characterData.character.race || '';
      this.shadowRoot.getElementById('background').value = characterData.character.background || '';
      this.shadowRoot.getElementById('appearance').value = characterData.character.appearance || '';
    }
  }
}

customElements.define('custom-character-header', CustomCharacterHeader);
