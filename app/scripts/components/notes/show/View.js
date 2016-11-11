/**
 * @module components/notes/show/View
 */
import Mn from 'backbone.marionette';
import _ from 'underscore';
import Mousetrap from 'mousetrap';
import Radio from 'backbone.radio';

import deb from 'debug';

const log = deb('lav:components/notes/show/View');

/**
 * Note view.
 *
 * @class
 * @extends Marionette.View
 * @license MPL-2.0
 */
export default class View extends Mn.View {

    get template() {
        const tmpl = require('./template.html');
        return _.template(tmpl);
    }

    get className() {
        return 'layout--body';
    }

    ui() {
        return {
            favorite : '.btn--favourite--icon',
            body     : '.-scroll',

            // Tasks
            tasks    : '.task [type="checkbox"]',
            progress : '.progress-bar',
            percent  : '.progress-percent',

            // Action buttons
            editBtn  : '.note--edit',
            rmBtn    : '.note--remove',
        };
    }

    events() {
        return {
            'click .btn--favourite' : 'toggleFavorite',
            'click @ui.tasks'       : 'toggleTask',
            'click @ui.rmBtn'       : 'triggerRemove',
        };
    }

    triggers() {
        return {
            'click .note--restore' : 'restore:model',
        };
    }

    modelEvents() {
        return {
            synced                 : 'render',
            'change:trash'         : 'render',
            'change:isFavorite'    : 'onChangeFavorite',
            'change:taskCompleted' : 'onTaskCompleted',
        };
    }

    constructor(...args) {
        super(...args);

        // Create debounced methods
        this.toggleTask     = _.debounce(this.toggleTask, 200);
        this.toggleFavorite = _.throttle(this.toggleFavorite, 300, {leading: false});
    }

    initialize() {
        // Bind shortcuts
        Mousetrap.bind('up', () => this.scrollTop());
        Mousetrap.bind('down', () => this.scrollDown());
        Mousetrap.bind(this.options.configs.actionsEdit, () => this.navigateEdit());
        Mousetrap.bind(this.options.configs.actionsRemove, () => this.triggerRemove());
        Mousetrap.bind(
            this.options.configs.actionsRotateStar,
            () => this.toggleFavorite()
        );
    }

    onDestroy() {
        Mousetrap.unbind([
            'up',
            'down',
            this.options.configs.actionsEdit,
            this.options.configs.actionsRemove,
            this.options.configs.actionsRotateStar,
        ]);
    }

    /**
     * Toggle favorite status of a note.
     *
     * @returns {Promise}
     */
    toggleFavorite() {
        log('toggle favorite');
        this.model.toggleFavorite();
        return Radio.request('collections/Notes', 'saveModel', {model: this.model});
    }

    /**
     * Toggle checked status of a task.
     *
     * @param {Object} e - event
     * @fires this#toggle:task
     */
    toggleTask(e) {
        log('toggle task');
        const $task  = this.$(e.currentTarget);
        const taskId = Number($task.attr('data-task'));

        $task.blur();
        $task.prop('checked', $task.is(':checked') === false);
        this.trigger('toggle:task', {taskId});
    }

    /**
     * Change favorite icon.
     */
    onChangeFavorite() {
        this.ui.favorite.toggleClass('icon-favorite', this.model.get('isFavorite'));
    }

    /**
     * Update task progress bar after the status of a task is changed.
     */
    onTaskCompleted() {
        const {taskCompleted, taskAll} = this.model.attributes;
        const percent = Math.floor(taskCompleted * 100 / taskAll);

        this.ui.progress.css({width: `${percent}%`});
        this.ui.percent.html(`${percent}%`);
    }

    /**
     * Scroll from bottom to top.
     */
    scrollTop() {
        this.ui.body.scrollTop(this.ui.body.scrollTop() - 50);
    }

    /**
     * Scroll from top to bottom.
     */
    scrollDown() {
        this.ui.body.scrollTop(this.ui.body.scrollTop() + 50);
    }

    /**
     * Navigate to edit page.
     */
    navigateEdit() {
        Radio.request('utils/Url', 'navigate', {url: this.ui.editBtn.attr('href')});
    }

    /**
     * Trigger remove event.
     *
     * @fires components/notes#remove
     */
    triggerRemove() {
        Radio.request('components/notes', 'remove', {model: this.model});
        return false;
    }

    serializeData() {
        return _.extend({}, this.model.attributes, {
            content     : this.model.htmlContent || this.model.get('content'),
            notebook    : (this.model.notebook || {}).attributes,
            profileLink : this.options.profileLink,
        });
    }

    templateContext() {
        return {
            createdDate() {
                return new Date(this.created).toLocaleDateString();
            },

            getProgress() {
                return Math.floor(this.taskCompleted * 100 / this.taskAll);
            },
        };
    }

}
