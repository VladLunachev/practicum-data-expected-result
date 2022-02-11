var Match,
  calculate_operations,
  consecutive_where,
  create_index,
  diff,
  find_match,
  find_matching_blocks,
  html_to_tokens,
  is_end_of_tag,
  is_start_of_tag,
  is_tag,
  is_whitespace,
  isnt_tag,
  op_map,
  recursively_find_matching_blocks,
  render_operations,
  wrap;
is_end_of_tag = function (char) {
  return char === '>';
};
is_start_of_tag = function (char) {
  return char === '<';
};
is_whitespace = function (char) {
  return /^\s+$/.test(char);
};
is_tag = function (token) {
  return /^\s*<[^>]+>\s*$/.test(token);
};
isnt_tag = function (token) {
  return !is_tag(token);
};
Match = class Match {
  constructor(start_in_before1, start_in_after1, length1) {
    this.start_in_before = start_in_before1;
    this.start_in_after = start_in_after1;
    this.length = length1;
    this.end_in_before = this.start_in_before + this.length - 1;
    this.end_in_after = this.start_in_after + this.length - 1;
  }
};
html_to_tokens = function (html) {
  var char, current_word, i, len, mode, words;
  mode = 'char';
  current_word = '';
  words = [];
  for (i = 0, len = html.length; i < len; i++) {
    char = html[i];
    switch (mode) {
      case 'tag':
        if (is_end_of_tag(char)) {
          current_word += '>';
          words.push(current_word);
          current_word = '';
          if (is_whitespace(char)) {
            mode = 'whitespace';
          } else {
            mode = 'char';
          }
        } else {
          current_word += char;
        }
        break;
      case 'char':
        if (is_start_of_tag(char)) {
          if (current_word) {
            words.push(current_word);
          }
          current_word = '<';
          mode = 'tag';
        } else if (/\s/.test(char)) {
          if (current_word) {
            words.push(current_word);
          }
          current_word = char;
          mode = 'whitespace';
        } else if (/[\w\#@]+/i.test(char)) {
          current_word += char;
        } else {
          if (current_word) {
            words.push(current_word);
          }
          current_word = char;
        }
        break;
      case 'whitespace':
        if (is_start_of_tag(char)) {
          if (current_word) {
            words.push(current_word);
          }
          current_word = '<';
          mode = 'tag';
        } else if (is_whitespace(char)) {
          current_word += char;
        } else {
          if (current_word) {
            words.push(current_word);
          }
          current_word = char;
          mode = 'char';
        }
        break;
      default:
        throw new Error(`Unknown mode ${mode}`);
    }
  }
  if (current_word) {
    words.push(current_word);
  }
  return words;
};
find_match = function (before_tokens, after_tokens, index_of_before_locations_in_after_tokens, start_in_before, end_in_before, start_in_after, end_in_after) {
  var best_match_in_after, best_match_in_before, best_match_length, i, index_in_after, index_in_before, j, len, locations_in_after, looking_for, match, match_length_at, new_match_length, new_match_length_at, ref, ref1;
  best_match_in_before = start_in_before;
  best_match_in_after = start_in_after;
  best_match_length = 0;
  match_length_at = {};
  for (index_in_before = i = ref = start_in_before, ref1 = end_in_before; ref <= ref1 ? i < ref1 : i > ref1; index_in_before = ref <= ref1 ? ++i : --i) {
    new_match_length_at = {};
    looking_for = before_tokens[index_in_before];
    locations_in_after = index_of_before_locations_in_after_tokens[looking_for];
    for (j = 0, len = locations_in_after.length; j < len; j++) {
      index_in_after = locations_in_after[j];
      if (index_in_after < start_in_after) {
        continue;
      }
      if (index_in_after >= end_in_after) {
        break;
      }
      if (match_length_at[index_in_after - 1] == null) {
        match_length_at[index_in_after - 1] = 0;
      }
      new_match_length = match_length_at[index_in_after - 1] + 1;
      new_match_length_at[index_in_after] = new_match_length;
      if (new_match_length > best_match_length) {
        best_match_in_before = index_in_before - new_match_length + 1;
        best_match_in_after = index_in_after - new_match_length + 1;
        best_match_length = new_match_length;
      }
    }
    match_length_at = new_match_length_at;
  }
  if (best_match_length !== 0) {
    match = new Match(best_match_in_before, best_match_in_after, best_match_length);
  }
  return match;
};
recursively_find_matching_blocks = function (before_tokens, after_tokens, index_of_before_locations_in_after_tokens, start_in_before, end_in_before, start_in_after, end_in_after, matching_blocks) {
  var match;
  match = find_match(before_tokens, after_tokens, index_of_before_locations_in_after_tokens, start_in_before, end_in_before, start_in_after, end_in_after);
  if (match != null) {
    if (start_in_before < match.start_in_before && start_in_after < match.start_in_after) {
      recursively_find_matching_blocks(before_tokens, after_tokens, index_of_before_locations_in_after_tokens, start_in_before, match.start_in_before, start_in_after, match.start_in_after, matching_blocks);
    }
    matching_blocks.push(match);
    if (match.end_in_before <= end_in_before && match.end_in_after <= end_in_after) {
      recursively_find_matching_blocks(before_tokens, after_tokens, index_of_before_locations_in_after_tokens, match.end_in_before + 1, end_in_before, match.end_in_after + 1, end_in_after, matching_blocks);
    }
  }
  return matching_blocks;
};
create_index = function (p) {
  var i, idx, index, len, ref, token;
  if (p.find_these == null) {
    throw new Error('params must have find_these key');
  }
  if (p.in_these == null) {
    throw new Error('params must have in_these key');
  }
  index = {};
  ref = p.find_these;
  for (i = 0, len = ref.length; i < len; i++) {
    token = ref[i];
    index[token] = [];
    idx = p.in_these.indexOf(token);
    while (idx !== -1) {
      index[token].push(idx);
      idx = p.in_these.indexOf(token, idx + 1);
    }
  }
  return index;
};
find_matching_blocks = function (before_tokens, after_tokens) {
  var index_of_before_locations_in_after_tokens, matching_blocks;
  matching_blocks = [];
  index_of_before_locations_in_after_tokens = create_index({
    find_these: before_tokens,
    in_these: after_tokens,
  });
  return recursively_find_matching_blocks(before_tokens, after_tokens, index_of_before_locations_in_after_tokens, 0, before_tokens.length, 0, after_tokens.length, matching_blocks);
};
calculate_operations = function (before_tokens, after_tokens) {
  var action_map,
    action_up_to_match_positions,
    i,
    index,
    is_single_whitespace,
    j,
    last_op,
    len,
    len1,
    match,
    match_starts_at_current_position_in_after,
    match_starts_at_current_position_in_before,
    matches,
    op,
    operations,
    position_in_after,
    position_in_before,
    post_processed;
  if (before_tokens == null) {
    throw new Error('before_tokens?');
  }
  if (after_tokens == null) {
    throw new Error('after_tokens?');
  }
  position_in_before = position_in_after = 0;
  operations = [];
  action_map = {
    'false,false': 'replace',
    'true,false': 'insert',
    'false,true': 'delete',
    'true,true': 'none',
  };
  matches = find_matching_blocks(before_tokens, after_tokens);
  matches.push(new Match(before_tokens.length, after_tokens.length, 0));
  for (index = i = 0, len = matches.length; i < len; index = ++i) {
    match = matches[index];
    match_starts_at_current_position_in_before = position_in_before === match.start_in_before;
    match_starts_at_current_position_in_after = position_in_after === match.start_in_after;
    action_up_to_match_positions = action_map[[match_starts_at_current_position_in_before, match_starts_at_current_position_in_after].toString()];
    if (action_up_to_match_positions !== 'none') {
      operations.push({
        action: action_up_to_match_positions,
        start_in_before: position_in_before,
        end_in_before: action_up_to_match_positions !== 'insert' ? match.start_in_before - 1 : void 0,
        start_in_after: position_in_after,
        end_in_after: action_up_to_match_positions !== 'delete' ? match.start_in_after - 1 : void 0,
      });
    }
    if (match.length !== 0) {
      operations.push({
        action: 'equal',
        start_in_before: match.start_in_before,
        end_in_before: match.end_in_before,
        start_in_after: match.start_in_after,
        end_in_after: match.end_in_after,
      });
    }
    position_in_before = match.end_in_before + 1;
    position_in_after = match.end_in_after + 1;
  }
  post_processed = [];
  last_op = {
    action: 'none',
  };
  is_single_whitespace = function (op) {
    if (op.action !== 'equal') {
      return false;
    }
    if (op.end_in_before - op.start_in_before !== 0) {
      return false;
    }
    return /^\s$/.test(before_tokens.slice(op.start_in_before, +op.end_in_before + 1 || 9e9));
  };
  for (j = 0, len1 = operations.length; j < len1; j++) {
    op = operations[j];
    if ((is_single_whitespace(op) && last_op.action === 'replace') || (op.action === 'replace' && last_op.action === 'replace')) {
      last_op.end_in_before = op.end_in_before;
      last_op.end_in_after = op.end_in_after;
    } else {
      post_processed.push(op);
      last_op = op;
    }
  }
  return post_processed;
};
consecutive_where = function (start, content, predicate) {
  var answer, i, index, last_matching_index, len, token;
  content = content.slice(start, +content.length + 1 || 9e9);
  last_matching_index = void 0;
  for (index = i = 0, len = content.length; i < len; index = ++i) {
    token = content[index];
    answer = predicate(token);
    if (answer === true) {
      last_matching_index = index;
    }
    if (answer === false) {
      break;
    }
  }
  if (last_matching_index != null) {
    return content.slice(0, +last_matching_index + 1 || 9e9);
  }
  return [];
};
wrap = function (tag, content) {
  var length, non_tags, position, rendering, tags;
  rendering = '';
  position = 0;
  length = content.length;
  while (true) {
    if (position >= length) {
      break;
    }
    non_tags = consecutive_where(position, content, isnt_tag);
    position += non_tags.length;
    if (non_tags.length !== 0) {
      rendering += `<${tag}>${non_tags.join('')}</${tag}>`;
    }
    if (position >= length) {
      break;
    }
    tags = consecutive_where(position, content, is_tag);
    position += tags.length;
    rendering += tags.join('');
  }
  return rendering;
};
op_map = {
  equal: function (op, before_tokens, after_tokens) {
    return before_tokens.slice(op.start_in_before, +op.end_in_before + 1 || 9e9).join('');
  },
  insert: function (op, before_tokens, after_tokens) {
    var val;
    val = after_tokens.slice(op.start_in_after, +op.end_in_after + 1 || 9e9);
    return wrap('ins class="er-right"', val);
  },
  delete: function (op, before_tokens, after_tokens) {
    var val;
    val = before_tokens.slice(op.start_in_before, +op.end_in_before + 1 || 9e9);
    return wrap('del class="er-wrong"', val);
  },
};
op_map.replace = function (op, before_tokens, after_tokens) {
  return op_map.delete(op, before_tokens, after_tokens) + op_map.insert(op, before_tokens, after_tokens);
};
render_operations = function (before_tokens, after_tokens, operations) {
  var i, len, op, rendering;
  rendering = '';
  for (i = 0, len = operations.length; i < len; i++) {
    op = operations[i];
    rendering += op_map[op.action](op, before_tokens, after_tokens);
  }
  return rendering;
};
diff = function (before, after) {
  var ops;
  if (before === after) {
    return before;
  }
  before = html_to_tokens(before);
  after = html_to_tokens(after);
  ops = calculate_operations(before, after);
  return render_operations(before, after, ops);
};
diff.html_to_tokens = html_to_tokens;
diff.find_matching_blocks = find_matching_blocks;
find_matching_blocks.find_match = find_match;
find_matching_blocks.create_index = create_index;
diff.calculate_operations = calculate_operations;
diff.render_operations = render_operations;
if (typeof define === 'function') {
  define([], function () {
    return diff;
  });
} else if (typeof module !== 'undefined' && module !== null) {
  module.exports = diff;
} else {
  this.htmldiff = diff;
}

// let expectedResultHTML = `
// <pre class="trainer-result__stdout-content trainer-result__stdout-content_max-content">Emoji name       | EmojiXpress,mil. | Instagram, mil. | Twitter, mil.
// -------------------------------------------------------------------
// Tears of Joy     |           233.00 |           7.31 |      1385.00
// Heart            |           118.00 |          26.00 |      1080.00
// Recycle          |             0.03 |           0.06 |       932.00
// Heart Eyes       |            64.60 |          11.20 |       834.00
// Heart Suit       |             3.31 |           1.82 |       697.00
// Loudly Crying    |            24.70 |           1.35 |       654.00
// Happy            |            22.70 |           4.26 |       565.00
// Unamused         |             6.00 |           0.24 |       478.00
// Two Hearts       |            10.00 |           5.69 |       445.00
// Kissing          |            87.50 |           5.13 |       432.00
// Winking          |            15.20 |           2.36 |       264.00
// Thumbs Up        |            23.10 |           3.75 |       227.00
// Sunglasses       |             4.72 |           3.93 |       198.00
// Beaming          |            19.10 |           1.69 |       150.00
// Fire             |             4.50 |           2.49 |       150.00
// Kiss Mark        |            21.70 |           2.87 |        98.70
// Grinning         |             2.26 |           1.02 |        87.30
// ROFL             |            25.60 |           0.77 |         0.00
// Thinking         |             6.81 |           0.64 |         0.00
// Shrugging        |             1.74 |           0.11 |         0.00
// </pre>`;

// let studentResultHTML = `
// <pre class="trainer-result__stdout-content trainer-result__stdout-content_max-content">Emoji name       | EmojiXpress, mil.| Instagram, mil.| Twitter, mil.
// -------------------------------------------------------------------
// Tears of Joy     |           233.00 |           7.31 |      2270.00
// Heart            |           118.00 |          26.00 |      1080.00
// Recycle          |             0.03 |           0.06 |       932.00
// Heart Eyes       |            64.60 |          11.20 |       834.00
// Heart Suit       |             3.31 |           1.82 |       697.00
// Loudly Crying    |            24.70 |           1.35 |       654.00
// Happy            |            22.70 |           4.26 |       565.00
// Unamused         |             6.00 |           0.24 |       478.00
// Two Hearts       |            10.00 |           5.69 |       445.00
// Kissing          |            87.50 |           5.13 |       432.00
// Winking          |            15.20 |           2.36 |       264.00
// Thumbs Up        |            23.10 |           3.75 |       227.00
// Sunglasses       |             4.72 |           3.93 |       198.00
// Beaming          |            19.10 |           1.69 |       150.00
// Fire             |             4.50 |           2.49 |       150.00
// Kiss Mark        |            21.70 |           2.87 |        98.70
// Grinning         |             2.26 |           1.02 |        87.30
// ROFL             |            25.60 |           0.77 |         0.00
// Thinking         |             6.81 |           0.64 |         0.00
// Shrugging        |             1.74 |           0.11 |         0.00
// </pre>`;

let expectedResultHTML = `
<section class="playground-terminal__stdout playground-terminal__stdout_type_logs playground-terminal__stdout_theme_light"><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average rating: 7.93
</pre></section><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average length: 135.93 min.
</pre></section><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average budget: $37.96 mil.
</pre></section><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average revenue: $347.99 mil.
</pre></section></section>`;

let studentResultHTML = `
<section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average rating: 7.93
</pre></section><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average length: 135.93 min.
</pre></section><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average budget: $37.9 mil.
</pre></section><section class="playground-terminal__stdout playground-terminal__stdout_type_stream playground-terminal__stdout_level_stdout"><pre class="playground-terminal__stdout-content">Average revenue: $34.99 mil.
</pre></section></section>`;

var erHeader = `
<span class="er-buttons c-result">Compared</span>
<span class="er-buttons s-result">Your Result</span>
<span class="er-buttons e-result">Expected Result</span>
<span class="er-tip">(press 1, 2, 3 or click on results to switch)</span>
`;
// отредактировать им попап ошибки (поменять иконку и текст)
var congrats = `
<div class="paragraph" id="conrgats">
It seems like you found an alternative solution, congratulation! Press the "Show Solution" button to learn another way of solving this task and move on to the next one. Good job!
</div>`;

function congratsPopup() {
  document.querySelector('.notification__content').innerHTML = congrats;
}

function initHeader() {
  document.querySelector('.trainer-result__header').innerHTML = erHeader;
}
function buttonsAndListeners() {
  document.querySelector('.c-result').addEventListener('click', (e) => {
    compared();
  });
  document.querySelector('.s-result').addEventListener('click', (e) => {
    student();
  });
  document.querySelector('.e-result').addEventListener('click', (e) => {
    expected();
  });
  document.addEventListener('keypress', (e) => {
    if (e.key == 1) {
      compared();
    }
  });
  document.addEventListener('keypress', (e) => {
    if (e.key == 2) {
      student();
    }
  });
  document.addEventListener('keypress', (e) => {
    if (e.key == 3) {
      expected();
    }
  });
}
function compared() {
  var comparedResult = htmldiff(studentResultHTML, expectedResultHTML);

  document.querySelector('.c-result').style.textDecoration = 'underline';
  document.querySelector('.s-result').style.textDecoration = 'none';
  document.querySelector('.e-result').style.textDecoration = 'none';
  document.querySelector('.c-result').style.color = 'black';
  document.querySelector('.s-result').style.color = '#A5A5A5';
  document.querySelector('.e-result').style.color = '#A5A5A5';

  document.querySelector('.playground-terminal__stdout').innerHTML = comparedResult;
}
function student() {
  document.querySelector('.c-result').style.textDecoration = 'none';
  document.querySelector('.s-result').style.textDecoration = 'underline';
  document.querySelector('.e-result').style.textDecoration = 'none';
  document.querySelector('.c-result').style.color = '#A5A5A5';
  document.querySelector('.s-result').style.color = 'black';
  document.querySelector('.e-result').style.color = '#A5A5A5';


  document.querySelector('.playground-terminal__stdout').innerHTML = studentResultHTML;
}
function expected() {
  document.querySelector('.c-result').style.textDecoration = 'none';
  document.querySelector('.s-result').style.textDecoration = 'none';
  document.querySelector('.e-result').style.textDecoration = 'underline';
  document.querySelector('.c-result').style.color = '#A5A5A5';
  document.querySelector('.s-result').style.color = '#A5A5A5';
  document.querySelector('.e-result').style.color = 'black';


  document.querySelector('.playground-terminal__stdout').innerHTML = expectedResultHTML;
}

function init() {
  console.log('init');

  var loading = setInterval(initER, 500);
  function initER() {
    if (document.querySelector('.trainer-result__header') !== null && document.querySelector('.playground-terminal__stdout') !== null) {
      clearInterval(loading);
      initHeader();
      setTimeout(() => {
        buttonsAndListeners();
        compared();
      }, 100);
    }
  }
}
// init on error if not traceback
var state = 'error';
var traceback = false
if (state == 'error' && traceback == false) {
  setTimeout(() => {
    expectedResultHTML == studentResultHTML ? congratsPopup() : console.log('not yet') // если ошибка, но результаты совпадают > модификация ассерта ошибки
    document.querySelector('.notification_type_success').style.borderColor = 'gray'
    // мб еще иконку заменить?
    // добавить кастомное событие в метрику - найдено альтернативное решение - добавить в тестовую либу
  }, 500)
  init();
}