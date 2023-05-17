document.addEventListener("DOMContentLoaded", () => {
    const dataForm = document.getElementById("dataForm");
    const inputName = document.getElementById("inputName");
    const linkInputsContainer = document.getElementById("linkInputsContainer");
    const addLinkInputButton = document.getElementById("addLinkInput");
    const removeLinkInputButton = document.getElementById("removeLinkInput");
    const inputDate = document.getElementById("inputDate");
    const ExpiryDate = document.getElementById("ExpiryDate");

    let linkInputIndex = 0;

    function addLinkInput() {
        const newLinkInput = document.createElement("div");
        newLinkInput.classList.add("link-input");

        const linkId = `inputLink${linkInputIndex}`;
        const linkNameId = `inputLinkName${linkInputIndex}`;

        newLinkInput.innerHTML = `
            <label for="${linkId}">Link:</label>
            <input id="${linkId}" type="text" class="inputLink" placeholder="Enter link">
            <label for="${linkNameId}">Document name:</label>
            <input id="${linkNameId}" type="text" class="inputLinkName" placeholder="Enter link name">
        `;
        linkInputsContainer.appendChild(newLinkInput);
        linkInputIndex++;
    }
    
    addLinkInputButton.addEventListener("click", addLinkInput);

    removeLinkInputButton.addEventListener("click", () => {
        const linkInputs = linkInputsContainer.getElementsByClassName("link-input");
        if (linkInputs.length > 1) {
            linkInputsContainer.removeChild(linkInputs[linkInputs.length - 1]);
            linkInputIndex--;
        }
    });
    
    document.getElementById("logout-button").addEventListener("click", function() {
        fetch('/logout', {method: 'GET'})
        .then(response => {
            if (response.ok) {
                // Redirect to login page after successful logout
                window.location.href = '/login';
            } else {
                alert('Logout failed');
            }
        });
    });
    
    document.getElementById('accountButton').addEventListener('click', function() {
        window.location.href = '/account';
    });    

    dataForm.addEventListener("submit", async (event) => {
        event.preventDefault();
    
        const name = inputName.value;
        const date = inputDate.value;
        const Expirydate = ExpiryDate.value;
        let linkInputs = linkInputsContainer.getElementsByClassName("link-input");
        const links = [];
    
        for (let i = 0; i < linkInputs.length; i++) {
            const linkInput = linkInputs[i];
            const link = linkInput.getElementsByClassName("inputLink")[0].value;
            const linkName = linkInput.getElementsByClassName("inputLinkName")[0].value;
            if (link && link !== "" && linkName && linkName !== "") {
                links.push({ link, linkName });
            }
        }
    
        try {
            const response = await fetch("/saveData", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, links, date, Expirydate }), 
            });
        
            if (response.ok) {
                alert("Data saved successfully!");
    
                // Reset the form
                dataForm.reset();
    
                // Get linkInputs again after the form has been reset
                linkInputs = linkInputsContainer.getElementsByClassName("link-input");
    
                // Remove all additional link input fields
                while (linkInputs.length > 1) {
                    linkInputsContainer.removeChild(linkInputs[linkInputs.length - 1]);
                }
    
                fetchData();
            } else {
                alert("Failed to save data!");
            }
            
        } catch (error) {
            console.error("Error:", error);
        }
    });

    async function fetchData(sortBy = '', direction = 'asc') {
        console.log("Sort direction:", direction);
        
        let url = '/getData';
        if (sortBy) {
            url += `?sort=${sortBy}&direction=${direction}`;
        }
        
        console.log("URL: ", url); // Log the URL
    
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);
        displayData(data);
    }
    
    document.getElementById('sortDateAsc').addEventListener('click', function(e) {
        const direction = e.target.dataset.sort;
        fetchData('date', direction);
    });
    
    document.getElementById('sortDateDesc').addEventListener('click', function(e) {
        const direction = e.target.dataset.sort;
        fetchData('date', direction);
    });
    
    document.getElementById('sortNameAsc').addEventListener('click', function(e) {
        const direction = e.target.dataset.sort;
        fetchData('name', direction);
    });
    
    document.getElementById('sortNameDesc').addEventListener('click', function(e) {
        const direction = e.target.dataset.sort;
        fetchData('name', direction);
    });
    

    async function searchByName(name) {
        const response = await fetch(`/searchData?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        console.log(data);
        displayData(data);
    }

    document.getElementById('searchButton').addEventListener('click', () => {
        const searchInput = document.getElementById('searchInput');
        const name = searchInput.value;
        searchByName(name);
    });

    async function deleteRecord(recordId) {
        const confirmation = document.getElementById("confirmation");
        confirmation.style.display = "block";
      
        document.getElementById("confirmYes").addEventListener("click", async () => {
          try {
            const response = await fetch(`/deleteData/${recordId}`, {
              method: "DELETE",
            });
      
            if (response.ok) {
              alert("Record deleted successfully!");
              fetchData();
            } else {
              alert("Failed to delete record!");
            }
          } catch (error) {
            console.error("Error:", error);
          }
          confirmation.style.display = "none";
        });
      
        document.getElementById("confirmNo").addEventListener("click", () => {
          confirmation.style.display = "none";
        });
      }
    

    function displayData(data) {
        const dataDisplay = document.getElementById('fetchedData');
        dataDisplay.innerHTML = '';
        
        data.forEach(item => {
            const dataItem = document.createElement('div');
            dataItem.classList.add('data-item');
    
            const hiddenPart = document.createElement('div');
            hiddenPart.style.display = 'none'; // Initially hide this part
    
            // Only these two fields will be visible by default
            dataItem.innerHTML = `
                <div>Name: ${item.name}</div>
                <div>Record creation date: ${new Date(item.date).toLocaleDateString()}</div>
            `;
    
            // The rest of the fields will be inside hiddenPart and initially hidden
            hiddenPart.innerHTML = `
                <div>Document creation date: ${new Date(item.user_chosen_date).toLocaleDateString()}</div>
                <div>Document expiry date: ${new Date(item.expiry_date).toLocaleDateString()}</div>
            `;
    
            // If there are links in the record, add all of them
            if (item.links) {
                item.links.forEach(linkObj => {
                    let link = linkObj.link;
                    if (!link.startsWith('http://') && !link.startsWith('https://')) {
                        link = 'http://' + link;
                    }
                    const linkDiv = document.createElement('div');
                    linkDiv.innerHTML = `Link: <a href="${link}" target="_blank">${linkObj.linkName}</a>`;
                    hiddenPart.appendChild(linkDiv);
                });
            }
            
            dataItem.appendChild(hiddenPart);
            
            // Add Expand/Collapse button
            const expandButton = document.createElement('button');
            expandButton.innerText = 'Expand';
            expandButton.addEventListener('click', () => {
                if (hiddenPart.style.display === 'none') {
                    hiddenPart.style.display = '';
                    expandButton.innerText = 'Collapse';
                } else {
                    hiddenPart.style.display = 'none';
                    expandButton.innerText = 'Expand';
                }
            });
            dataItem.appendChild(expandButton);
    
            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.addEventListener('click', () => {
                deleteRecord(item.id);
            });
            dataItem.appendChild(deleteButton);
            
            dataDisplay.appendChild(dataItem);
        });
    }
    

    fetchData();
});
