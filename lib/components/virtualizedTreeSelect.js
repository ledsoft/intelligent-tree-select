'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.VirtualizedTreeSelect = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _resultItem = require('./resultItem');

var _resultItem2 = _interopRequireDefault(_resultItem);

var _reactVirtualized = require('react-virtualized');

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _Select = require('./Select');

var _Select2 = _interopRequireDefault(_Select);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class VirtualizedTreeSelect extends _react.Component {

    constructor(props, context) {
        super(props, context);

        this._renderMenu = this._renderMenu.bind(this);
        this._processOptions = this._processOptions.bind(this);
        this._filterOptions = this._filterOptions.bind(this);
        this._optionRenderer = this._optionRenderer.bind(this);
        this._setListRef = this._setListRef.bind(this);
        this._setSelectRef = this._setSelectRef.bind(this);
        this.data = {};
        this.state = {
            options: []
        };
    }

    componentDidMount() {
        this._processOptions();
    }

    componentDidUpdate(prevProps) {
        if (this.props.options.length !== prevProps.options.length || this.props.expanded !== prevProps.expanded) {
            this._processOptions();
            this.forceUpdate();
        }
    }

    _processOptions() {
        //let now = new Date().getTime();
        let optionID;
        this.data = {};
        this.props.options.forEach(option => {
            option.expanded = this.props.expanded;
            optionID = option[option.providers[0].valueKey];
            this.data[optionID] = option;
        });

        const keys = Object.keys(this.data);
        let sortedArr = [];
        keys.forEach(xkey => {
            let option = this.data[xkey];
            if (!option.parent) sortedArr = this._getSortedOptionsWithDepthAndParent(sortedArr, xkey, 0, null);
        });

        this.setState({ options: sortedArr });
        //console.log("Process options (",sortedArr.length ,") end in: ", new Date().getTime() - now, "ms");
    }

    _getSortedOptionsWithDepthAndParent(sortedArr, key, depth, parentKey) {
        let option = this.data[key];

        option.depth = depth;
        if (!option.parent) option.parent = parentKey;

        sortedArr.push(option);

        option[option.providers[0].childrenKey].forEach(childID => {
            this._getSortedOptionsWithDepthAndParent(sortedArr, childID, depth + 1, key);
        });

        return sortedArr;
    }

    _optionRenderer({ focusedOption, focusOption, key, option, labelKey, selectValue, style, valueArray, onToggleClick }) {

        const className = ['VirtualizedSelectOption'];

        if (option === focusedOption) {
            className.push('VirtualizedSelectFocusedOption');
        }

        if (option.disabled) {
            className.push('VirtualizedSelectDisabledOption');
        }

        if (valueArray && valueArray.indexOf(option) >= 0) {
            className.push('VirtualizedSelectSelectedOption');
        }

        if (option.className) {
            className.push(option.className);
        }

        const events = option.disabled ? {} : {
            onClick: () => selectValue(option),
            onMouseEnter: () => focusOption(option),
            onToggleClick: () => onToggleClick()
        };

        return (
            //TODO default
            _react2.default.createElement(_resultItem2.default, _extends({
                className: className.join(' '),
                key: key,
                style: style,
                option: option,
                settings: {
                    renderAsTree: this.props.renderAsTree,
                    displayInfoOnHover: this.props.displayInfoOnHover,
                    displayState: this.props.displayState
                }
            }, events))
        );
    }

    // See https://github.com/JedWatson/react-select/#effeciently-rendering-large-lists-with-windowing
    _renderMenu({ focusedOption, focusOption, labelKey, onSelect, options, selectValue, valueArray }) {
        const { listProps, optionRenderer, childrenKey } = this.props;
        const focusedOptionIndex = options.indexOf(focusedOption);
        const height = this._calculateListHeight({ options });
        const innerRowRenderer = optionRenderer || this._optionRenderer;
        const onToggleClick = this.forceUpdate.bind(this);

        function wrappedRowRenderer({ index, key, style }) {
            const option = options[index];

            return innerRowRenderer({
                focusedOption,
                focusedOptionIndex,
                focusOption,
                key,
                labelKey,
                onSelect,
                option,
                optionIndex: index,
                options,
                selectValue: onSelect,
                style,
                valueArray,
                onToggleClick,
                childrenKey
            });
        }
        return _react2.default.createElement(
            _reactVirtualized.AutoSizer,
            { disableHeight: true },
            ({ width }) => _react2.default.createElement(_reactVirtualized.List, _extends({
                className: 'VirtualSelectGrid',
                height: height,
                ref: this._setListRef,
                rowCount: options.length,
                rowHeight: ({ index }) => this._getOptionHeight({
                    option: options[index]
                }),
                rowRenderer: wrappedRowRenderer,
                scrollToIndex: focusedOptionIndex,
                width: width
            }, listProps))
        );
    }

    _filterOptions(options, filter, selectedOptions) {
        //let now = new Date().getTime();

        let filtered = options.filter(option => {
            let label = option[option.providers[0].labelKey];
            if (typeof label === 'string' || label instanceof String) {
                return label.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
            } else {
                return option.providers[0].labelValue(label).toLowerCase().indexOf(filter.toLowerCase()) !== -1;
            }
        });

        let filteredWithParents = [];
        let index = 0;
        filtered.forEach(option => {
            filteredWithParents.push(option);
            let parent = option.parent ? option.parent.length > 0 ? this.data[option.parent] : null : null;

            while (parent) {
                if (filteredWithParents.includes(parent)) break;
                filteredWithParents.splice(index, 0, parent);
                parent = parent.parent ? parent.parent.length > 0 ? this.data[parent.parent] : null : null;
            }
            index = filteredWithParents.length;
        });

        for (let i = 0; i < filteredWithParents.length; i++) {
            if (!filteredWithParents[i].expanded) {
                let depth = filteredWithParents[i].depth;
                while (true) {
                    let option = filteredWithParents[i + 1];
                    if (option && option.depth > depth) filteredWithParents.splice(i + 1, 1);else break;
                }
            }
        }

        if (Array.isArray(selectedOptions) && selectedOptions.length) {
            const selectedValues = selectedOptions.map(option => option[option.providers[0].valueKey]);

            return filtered.filter(option => !selectedValues.includes(option[option.providers[0].valueKey]));
        }

        //console.log("Filter options (",options.length ,") end in: ", new Date().getTime() - now, "ms");
        return filteredWithParents;
    }

    _calculateListHeight({ options }) {
        const { maxHeight } = this.props;

        let height = 0;

        for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
            let option = options[optionIndex];

            height += this._getOptionHeight({ option });

            if (height > maxHeight) {
                return maxHeight;
            }
        }

        return height;
    }

    _getOptionHeight({ option }) {
        const { optionHeight } = this.props;

        return optionHeight instanceof Function ? optionHeight({ option }) : optionHeight;
    }

    _setListRef(ref) {
        this._listRef = ref;
    }

    _setSelectRef(ref) {
        this._selectRef = ref;
    }

    render() {
        let menuStyle = this.props.menuStyle || {};
        menuStyle.overflow = 'hidden';
        const menuRenderer = this.props.menuRenderer || this._renderMenu;
        const filterOptions = this.props.filterOptions || this._filterOptions;

        return _react2.default.createElement(_Select2.default, _extends({
            joinValues: !!this.props.multi,
            menuStyle: menuStyle,
            ref: this._setSelectRef,
            menuRenderer: menuRenderer,
            filterOptions: filterOptions
        }, this.props, {
            options: this.state.options
        }));
    }

}

VirtualizedTreeSelect.propTypes = {
    childrenKey: _propTypes2.default.string,
    expanded: _propTypes2.default.bool,
    isMenuOpen: _propTypes2.default.bool,
    listProps: _propTypes2.default.object,
    maxHeight: _propTypes2.default.number,
    menuRenderer: _propTypes2.default.func,
    optionHeight: _propTypes2.default.oneOfType([_propTypes2.default.number, _propTypes2.default.func]),
    renderAsTree: _propTypes2.default.bool
};

VirtualizedTreeSelect.defaultProps = {
    childrenKey: 'children',
    options: [],
    optionHeight: 25,
    expanded: false,
    isMenuOpen: false,
    maxHeight: 200,
    multi: false,
    renderAsTree: true
};

exports.VirtualizedTreeSelect = VirtualizedTreeSelect;