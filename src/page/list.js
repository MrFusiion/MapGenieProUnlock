module.exports = function () {
    // Add a searchbar to the page.
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

    let $gamesListContainer = $("#games-list-container");

    let $datalist = $("<datalist>").attr("id", "game-list");
    for (let game of $gamesListContainer.find(".games").children()) {
        let $option = $("option");
        $option.val($(game).find(".card-body > h4").text());
        $datalist.append($option);
    }
    $datalist.appendTo(document.body);

    let $gameSearchFrom = $(`<div class="game-search-container">
            <div class="game-search-form">
                <input list="games-list" type="search" placeholder="Search.." name="mg:game_search">
                <!--<button><i class="fa fa-search"></i></button>-->
            </div>
        </div>`);
    let $input = $gameSearchFrom.find("input");
    $gameSearchFrom.insertBefore($gamesListContainer);

    $input.on("keyup", () => {
        filterGameList($input.val());
    });
}