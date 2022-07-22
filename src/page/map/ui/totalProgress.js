class TotalProgress {
    constructor(window) {
        this.$element = $(`<div class="progress-item-wrapper">
            <div class="progress-item" id="total-progress" style="margin-right: 5%;">
                <span class="icon">0.00%</span>
                <span class="title"></span>
                <span class="counter">0/0</span>
                <div class="progress-bar-container">
                    <div class="progress-bar" role="progressbar" style="width: 0%;"></div>
                </div>
            </div>
        </div>
        <hr>`);

        this.$item = this.$element.find(".progress-item");
        
        this.$icon = this.$element.find(".icon").get(0);
        this.$counter = this.$element.find(".counter").get(0);
        this.$progressBar = this.$element.find(".progress-bar").get(0);

        this.$element.insertBefore($(window.document).find("#user-panel > div:first-of-type .category-progress"));
    }

    click(f) {
        return this.$item.click(f);
    }
    
    update(count, total) {
        let percent = count / total * 100;
        this.$icon.textContent = `${percent.toFixed(2)}%`;
        this.$counter.textContent = `${count} / ${total}`;
        this.$progressBar.style.width = `${percent}%`;
    }
}

module.exports = TotalProgress;