import { OHIF } from 'meteor/ohif:core';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveVar } from 'meteor/reactive-var';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

Template.measureFlow.onCreated(() => {
    const instance = Template.instance();

    instance.state = new ReactiveVar('closed');
    instance.description = new ReactiveVar('');
    instance.descriptionEdit = new ReactiveVar(false);

    instance.items = [{
        label: 'Category 1',
        value: 'Category 1',
        items: [{
            label: 'Subcategory 1.1',
            value: 'Subcategory 1.1'
        }, {
            label: 'Subcategory 1.2',
            value: 'Subcategory 1.2',
            items: [{
                label: 'Subcategory 1.2.1',
                value: 'Subcategory 1.2.1'
            }, {
                label: 'Subcategory 1.2.2',
                value: 'Subcategory 1.2.2',
                items: [{
                    label: 'Subcategory 1.2.2.1',
                    value: 'Subcategory 1.2.2.1'
                }, {
                    label: 'Subcategory 1.2.2.2',
                    value: 'Subcategory 1.2.2.2'
                }]
            }]
        }]
    }, {
        label: 'Category 2',
        value: 'Category 2',
        items: [{
            label: 'Subcategory 2.1',
            value: 'Subcategory 2.1'
        }, {
            label: 'Subcategory 2.2',
            value: 'Subcategory 2.2'
        }, {
            label: 'Subcategory 2.3',
            value: 'Subcategory 2.3'
        }]
    }, {
        label: 'Category 3',
        value: 'Category 3'
    }];

    const items = [
        'Adrenal',
        'Bladder',
        'Bone',
        'Brain',
        'Breast',
        'Colon',
        'Esophagus',
        'Extremities',
        'Gallbladder',
        'Kidney',
        'Liver',
        'Lung',
        'Lymph Node',
        'Muscle',
        'Neck',
        'Other: Soft Tissue',
        'Ovary',
        'Pancreas',
        'Pelvis',
        'Peritoneum/Omentum',
        'Prostate',
        'Retroperitoneum',
        'Small Bowel',
        'Spleen',
        'Stomach',
        'Subcutaneous'
    ];

    instance.items = [];
    _.each(items, item => {
        instance.items.push({
            label: item,
            value: item
        });
    });
});

Template.measureFlow.events({
    'click .measure-flow .btn-add, click .measure-flow .btn-rename'(event, instance) {
        // Set the open state for the component
        instance.state.set('open');

        // Wait template rerender before rendering the selectTree
        Tracker.afterFlush(() => {
            // Get the click position
            const position = {
                left: event.clientX,
                top: event.clientY,
            };

            // Define the data for selectTreeComponent
            const data = {
                key: 'label',
                items: instance.items,
                label: 'Assign label',
                searchPlaceholder: 'Search labels',
                storageKey: 'measureLabelCommon',
                position
            };

            // Define in which element the selectTree will be rendered in
            const parentElement = instance.$('.measure-flow')[0];

            // Render the selectTree element
            instance.selectTreeView = Blaze.renderWithData(Template.selectTree, data, parentElement);
        });
    },
    'click .measure-flow .btn-description'(event, instance) {
        // Fade out the action buttons
        instance.$('.measure-flow .actions').addClass('fadeOut');

        // Set the description edit mode
        instance.descriptionEdit.set(true);

        // Wait for DOM rerendering, resize and focus the description textarea
        Tracker.afterFlush(() => {
            const $textarea = instance.$('textarea');
            $textarea.trigger('input').focus();
        });
    },
    'input textarea, change textarea'(event, instance) {
        const element = event.currentTarget;
        const $element = $(element);

        // Resize the textarea based on its content length
        $element.css('max-height', 0);
        $element.height(element.scrollHeight);
        $element.css('max-height', '');
    },
    'keydown textarea'(event, instance) {
        // Unset the description edit mode if ENTER or ESC was pressed
        if (event.which === 13 || event.which === 27) {
            instance.$('.measure-flow .actions').removeClass('fadeOut');
            instance.descriptionEdit.set(false);
        }

        // Keep the current description if ENTER was pressed
        if (event.which === 13) {
            instance.description.set($(event.currentTarget).val());
        }
    },
    'click .select-tree-common label'(event, instance) {
        instance.commonClicked = true;
    },
    'change .select-tree-root'(event, instance) {
        // Stop here if it's an inner input event
        if (event.target !== event.currentTarget) {
            return;
        }

        const $treeRoot = $(event.currentTarget);
        instance.value = $treeRoot.data('component').value();
    },
    'click .tree-leaf input'(event, instance) {
        const $target = $(event.currentTarget);
        const $label = $target.closest('label');
        const $treeRoot = $label.closest('.select-tree-root');
        const $container = $treeRoot.find('.tree-options:first');
        if (instance.commonClicked) {
            const labelTop = $label.position().top;
            const containerCenter = Math.round($container.height() / 2);
            const labelCenter = Math.round($label.height() / 2);
            $container.scrollTop(labelTop - containerCenter + labelCenter);
        }

        instance.state.set('selected');
        Tracker.afterFlush(() => {
            const $measureFlow = instance.$('.measure-flow');
            const labelOffset = $label.offset();
            labelOffset.top -= 10;
            $measureFlow.css(labelOffset);
            $measureFlow.children('.tree-leaf').width($label.outerWidth());
        });

        $container.one('transitionend', event => Blaze.remove(instance.selectTreeView));
    }
});