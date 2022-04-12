let IS_LIST = window.location.href === "https://mapgenie.io/";

// Add a searchbar to the page.
if (IS_LIST) {
    const $gameList = $("#games-list-container > .games");

    function filterGameList(text) {
        $gameList.children().each((i, game) => {
            let gameName = $(game).find(".card-body > h4").text();
            if (gameName.toLowerCase().includes(text.toLowerCase())) {
                $(game).show();
            } else {
                $(game).hide();
            }
        });
    }



    $(`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">`).appendTo(document.head);
    $(`<style>
        .game-search-form {
            width: 40%;
            display: inline-block;
            float: right;
            margin-right: 20%;
        }

        .game-search-form > input {
            width: 85%;
            color: white;
            border: none;
            border-right: 1px solid hsla(0,0%,100%,.005);
            background: hsla(0,0%,100%,.025);
        }

        .game-search-form > button {
            border: none;
            background: hsla(0,0%,100%,.025);
            transition: background .2s ease-in-out;
        }

        .game-search-form > button:hover {
            background: hsla(0,0%, 100%,.03);
        }

        .game-search-form > button > i.fa-search {
            color: rgb(237, 99, 99);
        }
    </style>`).appendTo(document.head);

    let listHeader = document.querySelector("#games-list-container > h2");
    let listSortOptions = listHeader.querySelector(".game-sort-options");
    
    let $gameSearchForm = $(`<div class="game-search-form">
        <input type="text" placeholder="Search.." name="search">
        <button><i class="fa fa-search"></i></button>
    </div>`).insertBefore(listSortOptions);

    let $gameSearchInput = $gameSearchForm.find("input");
    $gameSearchInput.on("keyup", (e) => {
        if (e.keyCode === 13) {
            filterGameList($gameSearchInput.val());
        }
    });

    let $gameSearchButton = $gameSearchForm.find("button");
    $gameSearchButton.click(() => {
        filterGameList($gameSearchInput.val());   
    })
}