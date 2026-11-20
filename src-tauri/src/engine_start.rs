use std::collections::VecDeque;
use std::path::Path;
use std::time::Duration;

pub const APP: &str = "FormRef";
pub const SHELL_ENV: &str = "FORMREF_SHELL_PID";
pub const OLD_SHELL_ENV: &str = "FORMREF_PARENT_PID";
pub const ADDRESS_WAIT: Duration = Duration::from_secs(90);
pub const KEY_WAIT: Duration = Duration::from_secs(10);
pub const EXIT_WAIT: Duration = Duration::from_secs(1);
pub const EXIT_STEP: Duration = Duration::from_millis(50);
#[cfg(not(windows))]
pub const HELD_STEP: Duration = Duration::from_millis(250);
pub const BUSY_CODE: i32 = 2;
const KEY_MARK: &str = "window-key";
const TAIL_LINES: usize = 12;
const LINE_CHARS: usize = 300;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Wait {
    Address,
    Key,
}

impl Wait {
    pub fn limit(self) -> Duration {
        match self {
            Wait::Address => ADDRESS_WAIT,
            Wait::Key => KEY_WAIT,
        }
    }

    pub fn what(self) -> &'static str {
        match self {
            Wait::Address => "its engine to answer on its address",
            Wait::Key => "its engine to hand over the key for the window",
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum Failure {
    Missing,
    NotStarted(String),
    Stopped(Option<i32>),
    TimedOut(Wait),
    Window,
}

#[derive(Default)]
pub struct Tail(VecDeque<String>);

impl Tail {
    pub fn push(&mut self, line: &str) {
        if line.contains(KEY_MARK) {
            return;
        }
        let clean: String = line.chars().filter(|c| !c.is_control()).take(LINE_CHARS).collect();
        if clean.trim().is_empty() {
            return;
        }
        if self.0.len() == TAIL_LINES {
            self.0.pop_front();
        }
        self.0.push_back(clean);
    }

    pub fn lines(&self) -> Vec<String> {
        self.0.iter().cloned().collect()
    }
}

pub fn last_lines(text: &str) -> Vec<String> {
    let mut tail = Tail::default();
    for line in text.lines() {
        tail.push(line);
    }
    tail.lines()
}

pub fn sentence(failure: &Failure) -> String {
    match failure {
        Failure::Missing => format!("{APP} could not start: its engine program is missing from the install. Installing {APP} again puts it back."),
        Failure::NotStarted(reason) => format!("{APP} could not start its engine: {reason}"),
        Failure::Stopped(Some(BUSY_CODE)) => format!("{APP} could not start: another copy of its engine holds its data folder."),
        Failure::Stopped(Some(code)) => format!("{APP} could not start: its engine stopped with code {code} before the window could open."),
        Failure::Stopped(None) => format!("{APP} could not start: its engine stopped before the window could open."),
        Failure::TimedOut(wait) => format!("{APP} could not start: it waited {} seconds for {} and that did not happen.", wait.limit().as_secs(), wait.what()),
        Failure::Window => format!("{APP} could not open its window."),
    }
}

pub fn message(failure: &Failure, tail: &[String], log: Option<&Path>) -> String {
    let mut text = sentence(failure);
    if !tail.is_empty() {
        text.push_str("\n\nThe engine's last lines:\n");
        text.push_str(&tail.join("\n"));
    } else if matches!(failure, Failure::Stopped(_) | Failure::TimedOut(_)) {
        text.push_str("\n\nThe engine wrote nothing before that.");
    }
    if let Some(path) = log {
        text.push_str("\n\nThe engine's log: ");
        text.push_str(&path.to_string_lossy());
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_tail_keeps_the_last_lines_and_never_the_window_key() {
        let mut tail = Tail::default();
        for n in 0..15 {
            tail.push(&format!("line {n}"));
        }
        tail.push("formref-window-key: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        tail.push("   ");
        tail.push(&"x".repeat(1000));
        let lines = tail.lines();
        assert_eq!(lines.len(), TAIL_LINES);
        assert_eq!(lines[0], "line 4");
        assert_eq!(lines[TAIL_LINES - 1].len(), LINE_CHARS);
        assert!(lines.iter().all(|line| !line.contains("window-key")));
    }

    #[test]
    fn the_last_lines_of_a_log_are_read_the_same_way() {
        let mut log = String::new();
        for n in 0..20 {
            log.push_str(&format!("line {n}\r\n"));
        }
        log.push_str("formref-window-key: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n\n");
        log.push_str("formref is already running on /data (engine process 7).\n");
        let lines = last_lines(&log);
        assert_eq!(lines.len(), TAIL_LINES);
        assert_eq!(lines[0], "line 9");
        assert_eq!(lines[TAIL_LINES - 1], "formref is already running on /data (engine process 7).");
        assert!(last_lines("").is_empty());
    }

    #[test]
    fn every_failure_has_its_sentence_the_last_lines_and_the_log() {
        let log = Path::new("/logs/engine.log");
        let said = vec!["formref is already running on /data (engine process 7).".to_string()];
        let busy = message(&Failure::Stopped(Some(BUSY_CODE)), &said, Some(log));
        assert!(busy.starts_with("FormRef could not start: another copy of its engine holds its data folder."));
        assert!(busy.contains("The engine's last lines:\nformref is already running on /data (engine process 7)."));
        assert!(busy.ends_with("The engine's log: /logs/engine.log"));
        assert!(message(&Failure::Stopped(Some(3)), &[], Some(log)).contains("stopped with code 3"));
        assert!(message(&Failure::Stopped(None), &[], None).ends_with("The engine wrote nothing before that."));
        assert!(message(&Failure::Missing, &[], None).ends_with("puts it back."));
        assert!(sentence(&Failure::NotStarted("Access is denied.".to_string())).ends_with("its engine: Access is denied."));
        assert_eq!(sentence(&Failure::Window), "FormRef could not open its window.");
    }

    #[test]
    fn a_wait_that_runs_out_says_how_long_and_for_what() {
        assert!(sentence(&Failure::TimedOut(Wait::Address)).contains("waited 90 seconds for its engine to answer on its address"));
        assert!(sentence(&Failure::TimedOut(Wait::Key)).contains("waited 10 seconds for its engine to hand over the key for the window"));
    }
}
