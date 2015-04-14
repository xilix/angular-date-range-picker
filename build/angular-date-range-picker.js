(function() {
  angular.module("dateRangePicker", ['pasvaz.bindonce']);

  angular.module("dateRangePicker").directive("dateRangePicker", [
    "$compile", "$timeout", function($compile, $timeout) {
      var CUSTOM, pickerTemplate;
      pickerTemplate = "<div ng-show=\"visible\" class=\"angular-date-range-picker__picker scale-fade\" ng-click=\"handlePickerClick($event)\" ng-class=\"{'angular-date-range-picker--ranged': showRanged }\">\n  <div class=\"msgTopDatePicker\"><div class=\"msgTopStartDatePicker\">Start</div><div class=\"msgTopEndDatePicker\">End</div></div>\n  <div class=\"angular-date-range-picker__timesheet\" ng-repeat=\"month in months track by $index\">\n    <a ng-click=\"month.move(-1, $event)\" class=\"angular-date-range-picker__prev-month\">&#9664;</a>\n    <div bindonce class=\"angular-date-range-picker__month\">\n      <div class=\"angular-date-range-picker__month-name\">{{month.name}} {{month.year}}</div>\n      <table class=\"angular-date-range-picker__calendar\">\n        <tr>\n          <th bindonce ng-repeat=\"day in month.weeks[1]\" class=\"angular-date-range-picker__calendar-weekday\" bo-text=\"day.date.format('dd')\">\n          </th>\n        </tr>\n        <tr bindonce ng-repeat=\"week in month.weeks\">\n          <td\n              bo-class='{\n                \"angular-date-range-picker__calendar-day\": day,\n                \"angular-date-range-picker__calendar-day-selected\": day.selected,\n                \"angular-date-range-picker__calendar-day-disabled\": day.disabled,\n                \"angular-date-range-picker__calendar-day-start\": day.start\n              }'\n              ng-repeat=\"day in week track by $index\" ng-click=\"select(day, month.end, $event)\">\n              <div class=\"angular-date-range-picker__calendar-day-wrapper\" bo-text=\"day.date.date()\"></div>\n          </td>\n        </tr>\n      </table>\n    </div>\n    <a ng-click=\"month.move(+1, $event)\" class=\"angular-date-range-picker__next-month\">&#9654;</a>\n  </div>\n  <div class=\"angular-date-range-picker__panel\">\n    <div ng-show=\"showRanged\">\n      Select range: <select ng-click=\"prevent_select($event)\" ng-model=\"quick\" ng-options=\"e.range as e.label for e in quickList\"></select>\n    </div>\n    <div class=\"angular-date-range-picker__buttons\" ng-show=\"!applyOnSelect\">\n      <a ng-click=\"ok($event)\" class=\"angular-date-range-picker__apply\">{{ textApply || \"Apply\"}}</a>\n      <a ng-click=\"hide($event)\" class=\"angular-date-range-picker__cancel\">{{ textCancel || \"Cancel\" }}</a>\n    </div>\n  </div>\n</div>";
      CUSTOM = "CUSTOM";
      return {
        restrict: "AE",
        replace: true,
        template: "<span tabindex=\"0\" ng-keydown=\"hide()\" class=\"angular-date-range-picker__input\">\n  <span ng-if=\"showRanged\">\n    <span ng-show=\"!!model\">{{ model.start.format(\"ll\") }} - {{ model.end.format(\"ll\") }}</span>\n    <span ng-hide=\"!!model\">Select date range</span>\n  </span>\n  <span ng-if=\"!showRanged\">\n    <span ng-show=\"!!model\">{{ model.format(\"ll\") }}</span>\n    <span ng-hide=\"!!model\">Select date</span>\n  </span>\n</span>",
        scope: {
          model: "=ngModel",
          customSelectOptions: "=",
          applyOnSelect: '=',
          ranged: "=",
          pastDates: "@",
          textApply: "@",
          textCancel: "@",
          callback: "&"
        },
        link: function($scope, element, attrs) {
          var documentClickFn, domEl, _calculateRange, _checkQuickList, _getMonthIndex, _makeQuickList, _move, _prepare, _prepareMonth, _resetMonthsFromRange, _setMonthsMovement, _setMonthsName;
          $scope.quickListDefinitions = $scope.customSelectOptions;
          if ($scope.quickListDefinitions == null) {
            $scope.quickListDefinitions = [
              {
                label: "This week",
                range: moment().range(moment().startOf("week").startOf("day"), moment().endOf("week").startOf("day"))
              }, {
                label: "Next week",
                range: moment().range(moment().startOf("week").add(1, "week").startOf("day"), moment().add(1, "week").endOf("week").startOf("day"))
              }, {
                label: "This fortnight",
                range: moment().range(moment().startOf("week").startOf("day"), moment().add(1, "week").endOf("week").startOf("day"))
              }, {
                label: "This month",
                range: moment().range(moment().startOf("month").startOf("day"), moment().endOf("month").startOf("day"))
              }, {
                label: "Next month",
                range: moment().range(moment().startOf("month").add(1, "month").startOf("day"), moment().add(1, "month").endOf("month").startOf("day"))
              }
            ];
          }
          $scope.quick = null;
          $scope.range = null;
          $scope.selecting = false;
          $scope.selectingEnded = false;
          $scope.visible = false;
          $scope.start = null;
          $scope.showRanged = $scope.ranged === void 0 ? true : $scope.ranged;
          _makeQuickList = function(includeCustom) {
            var e, _i, _len, _ref, _results;
            if (includeCustom == null) {
              includeCustom = false;
            }
            if (!$scope.showRanged) {
              return;
            }
            $scope.quickList = [];
            if (includeCustom) {
              $scope.quickList.push({
                label: "Custom",
                range: CUSTOM
              });
            }
            _ref = $scope.quickListDefinitions;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              e = _ref[_i];
              _results.push($scope.quickList.push(e));
            }
            return _results;
          };
          _calculateRange = function() {
            var end, start;
            if ($scope.showRanged) {
              return $scope.range = $scope.selection ? (start = $scope.selection.start.clone().startOf("month").startOf("day"), end = $scope.selection.end.clone().endOf("month").startOf("day"), moment().range(start, end)) : moment().range(moment().startOf("month").startOf("day"), moment().endOf("month").endOf("day"));
            } else {
              $scope.selection = false;
              $scope.selection = $scope.model || false;
              $scope.date = moment($scope.model) || moment();
              return $scope.range = moment().range(moment($scope.date).startOf("month"), moment($scope.date).endOf("month"));
            }
          };
          _checkQuickList = function() {
            var e, _i, _len, _ref;
            if (!$scope.showRanged) {
              return;
            }
            if (!$scope.selection) {
              return;
            }
            _ref = $scope.quickList;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              e = _ref[_i];
              if (e.range !== CUSTOM && $scope.selection.start.startOf("day").unix() === e.range.start.startOf("day").unix() && $scope.selection.end.startOf("day").unix() === e.range.end.startOf("day").unix()) {
                $scope.quick = e.range;
                _makeQuickList();
                return;
              }
            }
            $scope.quick = CUSTOM;
            return _makeQuickList(true);
          };
          _prepareMonth = function(dateMonth, isEndMonth) {
            var range, startDay;
            startDay = moment().startOf("week").day();
            range = moment().range(dateMonth.startOf("month").startOf("day").toDate().getTime(), dateMonth.endOf("month").endOf("day").toDate().getTime());
            return range.by("days", function(date) {
              var d, dis, disEnd, disStart, monthIndex, sel, w, _base, _base1, _base2, _base3;
              d = date.day() - startDay;
              if (d < 0) {
                d = 7 + d;
              }
              w = parseInt((7 + date.date() - d) / 7);
              monthIndex = 0;
              sel = false;
              disEnd = false;
              disStart = false;
              if ($scope.showRanged) {
                if ($scope.start) {
                  sel = date === $scope.start;
                  disEnd = date < $scope.start;
                }
                if ($scope.end) {
                  sel = date === $scope.end;
                  disStart = date > $scope.end;
                }
                if ($scope.start && $scope.end) {
                  sel = $scope.selection && $scope.selection.contains(date);
                }
              } else {
                sel = date.isSame($scope.selection);
                if ($scope.pastDates) {
                  dis = moment().diff(date, 'days') > 0;
                }
              }
              if (isEndMonth) {
                (_base = $scope.months)[1] || (_base[1] = {
                  name: date.format("MMMM YYYY"),
                  weeks: []
                });
                (_base1 = $scope.months[1].weeks)[w] || (_base1[w] = []);
                return $scope.months[1].weeks[w][d] = {
                  date: date,
                  selected: sel,
                  disabled: disEnd,
                  start: $scope.start && $scope.start.unix() === date.unix()
                };
              } else {
                (_base2 = $scope.months)[0] || (_base2[0] = {
                  name: date.format("MMMM YYYY"),
                  weeks: []
                });
                (_base3 = $scope.months[0].weeks)[w] || (_base3[w] = []);
                return $scope.months[0].weeks[w][d] = {
                  date: date,
                  selected: sel,
                  disabled: disStart,
                  start: $scope.start && $scope.start.unix() === date.unix()
                };
              }
            });
          };
          _prepare = function() {
            var m, _i, _len, _ref;
            $scope.months[0].weeks = [];
            $scope.months[1].weeks = [];
            _prepareMonth($scope.range.start, false);
            _prepareMonth($scope.range.end, true);
            _ref = $scope.months;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              m = _ref[_i];
              if (!m.weeks[0]) {
                m.weeks.splice(0, 1);
              }
            }
            _checkQuickList();
            _setMonthsName($scope.range);
            _setMonthsMovement($scope.range);
            if ($scope.selectingEnded && !$scope.start && $scope.applyOnSelect) {
              $scope.selectingEnded = false;
              return $scope.ok();
            }
          };
          $scope.show = function() {
            $scope.selection = $scope.model;
            _calculateRange();
            _prepare();
            return $scope.visible = true;
          };
          $scope.hide = function($event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            return $scope.visible = false;
          };
          $scope.prevent_select = function($event) {
            return $event != null ? typeof $event.stopPropagation === "function" ? $event.stopPropagation() : void 0 : void 0;
          };
          $scope.ok = function($event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            $scope.model = $scope.selection;
            $timeout(function() {
              if ($scope.callback) {
                return $scope.callback();
              }
            });
            return $scope.hide();
          };
          $scope.select = function(day, isMonthEnd, $event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            if (isMonthEnd) {
              if (day.disabled) {
                return;
              }
            }
            $scope.selectingEnded = isMonthEnd;
            if ($scope.showRanged) {
              $scope.selecting = !$scope.selecting;
              if (isMonthEnd) {
                $scope.end = day.date;
              } else {
                $scope.start = day.date;
              }
              if ($scope.start && !$scope.end) {
                _move(1, _getMonthIndex($scope.start) - _getMonthIndex($scope.range.end));
              }
              if ($scope.start && $scope.end && $scope.end.diff($scope.start) < 0) {
                _move(1, _getMonthIndex($scope.start) - _getMonthIndex($scope.end));
                $scope.end = $scope.start;
              }
              if ($scope.start && $scope.end) {
                $scope.selection = moment().range($scope.start, $scope.end);
              }
            } else {
              $scope.selection = moment(day.date);
            }
            return _prepare();
          };
          _setMonthsName = function(range) {
            $scope.months[0].name = range.start.format("MMMM");
            $scope.months[0].year = range.start.format("YYYY");
            $scope.months[0].start = true;
            $scope.months[1].name = range.end.format("MMMM");
            $scope.months[1].year = range.end.format("YYYY");
            return $scope.months[1].end = true;
          };
          _getMonthIndex = function(momentDate) {
            return momentDate.year() * 12 + momentDate.month();
          };
          _setMonthsMovement = function(range) {
            var endMonth, startMonth;
            startMonth = _getMonthIndex(range.start);
            endMonth = _getMonthIndex(range.end);
            $scope.months[0].hasPrevious = true;
            $scope.months[0].hasNext = true;
            $scope.months[1].hasPrevious = true;
            $scope.months[1].hasNext = true;
            if (startMonth === endMonth) {
              $scope.months[0].hasNext = false;
              return $scope.months[1].hasPrevious = false;
            }
          };
          _move = function(monthIndex, n, $event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            if ($scope.showRanged) {
              if (monthIndex === 1) {
                $scope.range = {
                  start: $scope.range.start.clone().startOf("month").startOf("day"),
                  end: $scope.range.end.add(n, 'months').endOf("month").endOf("day")
                };
              } else {
                $scope.range = {
                  start: $scope.range.start.add(n, "months").startOf("month").startOf("day"),
                  end: $scope.range.end.clone().endOf("month").endOf("day")
                };
              }
            } else {
              $scope.date.add(n, 'months');
              $scope.range = {
                start: moment($scope.date).startOf("month"),
                end: moment($scope.date).endOf("month")
              };
            }
            _setMonthsName($scope.range);
            _setMonthsMovement($scope.range);
            return _prepare();
          };
          _resetMonthsFromRange = function(range) {
            $scope.months = [
              {
                move: function(n, $event) {
                  return _move(0, n, $event);
                },
                weeks: []
              }, {
                move: function(n, $event) {
                  return _move(1, n, $event);
                },
                weeks: []
              }
            ];
            _setMonthsName(range);
            return _setMonthsMovement(range);
          };
          $scope.handlePickerClick = function($event) {
            return $event != null ? typeof $event.stopPropagation === "function" ? $event.stopPropagation() : void 0 : void 0;
          };
          $scope.$watch("quick", function(q, o) {
            if (!q || q === CUSTOM) {
              return;
            }
            $scope.selection = $scope.quick;
            $scope.selecting = false;
            $scope.start = null;
            _calculateRange();
            return _prepare();
          });
          $scope.$watch("customSelectOptions", function(value) {
            if (typeof customSelectOptions === "undefined" || customSelectOptions === null) {
              return;
            }
            return $scope.quickListDefinitions = value;
          });
          domEl = $compile(angular.element(pickerTemplate))($scope);
          element.append(domEl);
          element.bind("click", function(e) {
            if (e != null) {
              if (typeof e.stopPropagation === "function") {
                e.stopPropagation();
              }
            }
            return $scope.$apply(function() {
              if ($scope.visible) {
                return $scope.hide();
              } else {
                return $scope.show();
              }
            });
          });
          documentClickFn = function(e) {
            $scope.$apply(function() {
              return $scope.hide();
            });
            return true;
          };
          angular.element(document).bind("click", documentClickFn);
          $scope.$on('$destroy', function() {
            return angular.element(document).unbind('click', documentClickFn);
          });
          _makeQuickList();
          _calculateRange();
          _resetMonthsFromRange($scope.range);
          return _prepare();
        }
      };
    }
  ]);

}).call(this);
