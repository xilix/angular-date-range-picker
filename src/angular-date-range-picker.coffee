angular.module "dateRangePicker", ['pasvaz.bindonce']

angular.module("dateRangePicker").directive "dateRangePicker", ["$compile", "$timeout", ($compile, $timeout) ->
  # constants
  pickerTemplate = """
  <div ng-show="visible" class="angular-date-range-picker__picker scale-fade" ng-click="handlePickerClick($event)" ng-class="{'angular-date-range-picker--ranged': showRanged }">
    <div class="msgTopDatePicker"><div class="msgTopStartDatePicker">Start</div><div class="msgTopEndDatePicker">End</div></div>
    <div class="angular-date-range-picker__timesheet" ng-repeat="month in months track by $index">
      <a ng-click="month.move(-1, $event)" class="angular-date-range-picker__prev-month">&#9664;</a>
      <div bindonce class="angular-date-range-picker__month">
        <div class="angular-date-range-picker__month-name">{{month.name}} {{month.year}}</div>
        <table class="angular-date-range-picker__calendar">
          <tr>
            <th bindonce ng-repeat="day in month.weeks[1]" class="angular-date-range-picker__calendar-weekday" bo-text="day.date.format('dd')">
            </th>
          </tr>
          <tr bindonce ng-repeat="week in month.weeks">
            <td
                bo-class='{
                  "angular-date-range-picker__calendar-day": day,
                  "angular-date-range-picker__calendar-day-selected": day.selected,
                  "angular-date-range-picker__calendar-day-disabled": day.disabled,
                  "angular-date-range-picker__calendar-day-start": day.start
                }'
                ng-repeat="day in week track by $index" ng-click="select(day, month.end, $event)">
                <div class="angular-date-range-picker__calendar-day-wrapper" bo-text="day.date.date()"></div>
            </td>
          </tr>
        </table>
      </div>
      <a ng-click="month.move(+1, $event)" class="angular-date-range-picker__next-month">&#9654;</a>
    </div>
    <div class="angular-date-range-picker__panel">
      <div ng-show="showRanged">
        Select range: <select ng-click="prevent_select($event)" ng-model="quick" ng-options="e.range as e.label for e in quickList"></select>
      </div>
      <div class="angular-date-range-picker__buttons" ng-show="!applyOnSelect">
        <a ng-click="ok($event)" class="angular-date-range-picker__apply">{{ textApply || "Apply"}}</a>
        <a ng-click="hide($event)" class="angular-date-range-picker__cancel">{{ textCancel || "Cancel" }}</a>
      </div>
    </div>
  </div>
  """
  CUSTOM = "CUSTOM"

  restrict: "AE"
  replace: true
  template: """
  <span tabindex="0" ng-keydown="hide()" class="angular-date-range-picker__input">
    <span ng-if="showRanged">
      <span ng-show="!!model">{{ model.start.format("ll") }} - {{ model.end.format("ll") }}</span>
      <span ng-hide="!!model">Select date range</span>
    </span>
    <span ng-if="!showRanged">
      <span ng-show="!!model">{{ model.format("ll") }}</span>
      <span ng-hide="!!model">Select date</span>
    </span>
  </span>
  """
  scope:
    model: "=ngModel" # can't use ngModelController, we need isolated scope
    customSelectOptions: "="
    applyOnSelect: '='
    ranged: "="
    pastDates: "@"
    textApply: "@"
    textCancel: "@"
    callback: "&"

  link: ($scope, element, attrs) ->
    $scope.quickListDefinitions = $scope.customSelectOptions
    $scope.quickListDefinitions ?= [
      {
        label: "This week",
        range: moment().range(
          moment().startOf("week").startOf("day"),
          moment().endOf("week").startOf("day")
        )
      }
      {
        label: "Next week",
        range: moment().range(
          moment().startOf("week").add(1, "week").startOf("day"),
          moment().add(1, "week").endOf("week").startOf("day")
        )
      }
      {
        label: "This fortnight",
        range: moment().range(
          moment().startOf("week").startOf("day"),
          moment().add(1, "week").endOf("week").startOf("day")
        )
      }
      {
        label: "This month",
        range: moment().range(
          moment().startOf("month").startOf("day"),
          moment().endOf("month").startOf("day")
        )
      }
      {
        label: "Next month",
        range: moment().range(
          moment().startOf("month").add(1, "month").startOf("day"),
          moment().add(1, "month").endOf("month").startOf("day")
        )
      }
    ]
    $scope.quick = null
    $scope.range = null
    $scope.selecting = false
    $scope.selectingEnded = false
    $scope.visible = false
    $scope.start = null
    # Backward compatibility - if $scope.ranged is not set in the html, it displays normal date range picker.
    $scope.showRanged = if $scope.ranged == undefined then true else $scope.ranged

    _makeQuickList = (includeCustom = false) ->
      return unless $scope.showRanged
      $scope.quickList = []
      $scope.quickList.push(label: "Custom", range: CUSTOM) if includeCustom
      for e in $scope.quickListDefinitions
        $scope.quickList.push(e)

    _calculateRange = () ->
      if $scope.showRanged
        $scope.range = if $scope.selection
          start = $scope.selection.start.clone().startOf("month").startOf("day")
          end = $scope.selection.end.clone().endOf("month").startOf("day")
          moment().range(start, end)
        else
          moment().range(
            moment().startOf("month").startOf("day"),
            moment().endOf("month").endOf("day")
          )

        if $scope.model && $scope.model.start
          $scope.start = $scope.model.start

        if $scope.model && $scope.model.end
          $scope.end = $scope.model.end

        if $scope.start && $scope.end
          $scope.selection = moment().range($scope.start, $scope.end)
      else
        $scope.selection = false
        $scope.selection = $scope.model || false
        $scope.date = moment($scope.model) || moment()
        $scope.range = moment().range(
          moment($scope.date).startOf("month"),
          moment($scope.date).endOf("month")
        )

    _checkQuickList = () ->
      return unless $scope.showRanged
      return unless $scope.selection
      for e in $scope.quickList
        if e.range != CUSTOM and $scope.selection.start.startOf("day").unix() == e.range.start.startOf("day").unix() and
            $scope.selection.end.startOf("day").unix() == e.range.end.startOf("day").unix()
          $scope.quick = e.range
          _makeQuickList()
          return

      $scope.quick = CUSTOM
      _makeQuickList(true)

    _prepareMonth = (dateMonth, isEndMonth) ->
      startDay = moment().startOf("week").day()

      range = moment().range(
        dateMonth.startOf("month").startOf("day").toDate().getTime(),
        dateMonth.endOf("month").endOf("day").toDate().getTime()
      )

      range.by "days", (date) ->
        d = date.day() - startDay
        d = 7+d if d < 0 # (d == -1 fix for sunday)
        w = parseInt((7 + date.date() - d) / 7)
        monthIndex = 0

        sel = false
        disEnd = false
        disStart = false

        if $scope.showRanged
          if $scope.start
            sel = date == $scope.start
            disEnd = date < $scope.start

          if $scope.end
            sel = date == $scope.end
            disStart = date > $scope.end

          if $scope.start && $scope.end
            sel = $scope.selection && $scope.selection.contains(date)
        else
          sel = date.isSame($scope.selection)
          dis = moment().diff(date, 'days') > 0 if $scope.pastDates

        if (isEndMonth)
          $scope.months[1] ||= {name: date.format("MMMM YYYY"), weeks: []}
          $scope.months[1].weeks[w] ||= []
          $scope.months[1].weeks[w][d] =
            date:     date
            selected: sel
            disabled: disEnd
            start:    ($scope.start && $scope.start.unix() == date.unix())
        else
          $scope.months[0] ||= {name: date.format("MMMM YYYY"), weeks: []}
          $scope.months[0].weeks[w] ||= []
          $scope.months[0].weeks[w][d] =
            date:     date
            selected: sel
            disabled: disStart
            start:    ($scope.start && $scope.start.unix() == date.unix())

    _prepare = () ->
      $scope.months[0].weeks = []
      $scope.months[1].weeks = []

      _prepareMonth($scope.range.start, false)
      _prepareMonth($scope.range.end, true)

      # Remove empty rows
      for m in $scope.months
        if !m.weeks[0]
          m.weeks.splice(0, 1)

      _checkQuickList()
      _setMonthsName($scope.range)
      _setMonthsMovement($scope.range)

      if $scope.selectingEnded && !$scope.start && $scope.applyOnSelect
        $scope.selectingEnded =false
        $scope.ok()

    $scope.show = () ->
      $scope.selection = $scope.model
      _calculateRange()
      _prepare()
      $scope.visible = true

    $scope.hide = ($event) ->
      $event?.stopPropagation?()
      $scope.visible = false

    $scope.prevent_select = ($event) ->
      $event?.stopPropagation?()

    $scope.ok = ($event) ->
      $event?.stopPropagation?()
      $scope.model = $scope.selection
      $timeout -> $scope.callback() if $scope.callback
      $scope.hide()

    $scope.select = (day, isMonthEnd, $event) ->
      $event?.stopPropagation?()
      if isMonthEnd
        return if day.disabled

      $scope.selectingEnded = isMonthEnd
      if $scope.showRanged
        $scope.selecting = !$scope.selecting

        if isMonthEnd
          $scope.end = day.date
        else
          $scope.start = day.date

        if $scope.start && !$scope.end
          _move(1, _getMonthIndex($scope.start) - _getMonthIndex($scope.range.end))

        if $scope.start && $scope.end && $scope.end.diff($scope.start) < 0
          _move(1, _getMonthIndex($scope.start) - _getMonthIndex($scope.end))
          $scope.end = $scope.start

        if $scope.start && $scope.end
          $scope.selection = moment().range($scope.start, $scope.end)

      else
        $scope.selection = moment(day.date)

      _prepare()

    _setMonthsName = (range) ->
      $scope.months[0].name = range.start.format("MMMM")
      $scope.months[0].year = range.start.format("YYYY")
      $scope.months[0].start = true
      $scope.months[1].name = range.end.format("MMMM")
      $scope.months[1].year = range.end.format("YYYY")
      $scope.months[1].end = true

    _getMonthIndex = (momentDate) ->
      return momentDate.year()*12 + momentDate.month()

    _setMonthsMovement = (range) ->
      startMonth = _getMonthIndex(range.start)
      endMonth = _getMonthIndex(range.end)

      $scope.months[0].hasPrevious = true
      $scope.months[0].hasNext = true
      $scope.months[1].hasPrevious = true
      $scope.months[1].hasNext = true
      if (startMonth == endMonth)
        $scope.months[0].hasNext = false
        $scope.months[1].hasPrevious = false

    _move = (monthIndex, n, $event) ->
      $event?.stopPropagation?()
      if $scope.showRanged
        if monthIndex == 1
          $scope.range =
            start: $scope.range.start.clone().startOf("month").startOf("day")
            end: $scope.range.end.add(n, 'months').endOf("month").endOf("day")
        else
          $scope.range =
            start: $scope.range.start.add(n, "months").startOf("month").startOf("day")
            end: $scope.range.end.clone().endOf("month").endOf("day")
      else
        $scope.date.add(n, 'months')
        $scope.range =
          start: moment($scope.date).startOf("month"),
          end: moment($scope.date).endOf("month")

      _setMonthsName($scope.range)
      _setMonthsMovement($scope.range)
      _prepare()

    _resetMonthsFromRange = (range) ->
      $scope.months = [
        {
          move: (n, $event) -> _move(0, n, $event),
          weeks: []
        },
        {
          move: (n, $event) -> _move(1, n, $event),
          weeks: []
        }
      ]
      _setMonthsName(range)
      _setMonthsMovement(range)


    $scope.handlePickerClick = ($event) ->
      $event?.stopPropagation?()

    $scope.$watch "quick", (q, o) ->
      return if !q || q == CUSTOM
      $scope.selection = $scope.quick
      $scope.selecting = false
      $scope.start = null
      _calculateRange()
      _prepare()

    $scope.$watch "customSelectOptions", (value) ->
      return unless customSelectOptions?
      $scope.quickListDefinitions = value

    # create DOM and bind event
    domEl = $compile(angular.element(pickerTemplate))($scope)
    element.append(domEl)

    element.bind "click", (e) ->
      e?.stopPropagation?()
      $scope.$apply ->
        if $scope.visible then $scope.hide() else $scope.show()

    documentClickFn = (e) ->
      $scope.$apply -> $scope.hide()
      true

    angular.element(document).bind "click", documentClickFn

    $scope.$on '$destroy', ->
      angular.element(document).unbind 'click', documentClickFn

    _makeQuickList()
    _calculateRange()
    _resetMonthsFromRange($scope.range)
    _prepare()
]
