
  export  function createInventoryMenuAndControls(){
        // Create the inventory container
        const inventory = document.createElement('div');
        inventory.id = 'inventory';
        
        // Create the inventory header
        const inventoryHeader = document.createElement('h2');
        inventoryHeader.innerText = 'Inventory';
        inventory.appendChild(inventoryHeader);

        // Add some sample items
        for (let i = 1; i <= 3; i++) {
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.innerText = 'Item ' + i;
            inventory.appendChild(item);
        }

        const container = document.getElementById('scene-container');
        container.appendChild(inventory)

        // Event listener to toggle the inventory display
        document.addEventListener('keydown', (event) => {
            if (event.key === 'i' || event.key === 'I') {
                if (inventory.style.display === 'none') {
                    inventory.style.display = 'block';
                } else {
                    inventory.style.display = 'none';
                }
            }
        });
    // Prevent event propagation when interacting with the inventory
    // inventory.addEventListener('mousedown', (event) => {event.stopPropagation();});
    // inventory.addEventListener('mousemove', (event) => {event.stopPropagation();});
    // inventory.addEventListener('mouseup', (event) => {event.stopPropagation();});
}
