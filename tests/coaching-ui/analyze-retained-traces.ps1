param([Parameter(Mandatory=$true)][string]$TraceDirectory,[Parameter(Mandatory=$true)][string]$Output)
# Reads trace ZIPs directly. Whitelist output; never export request bodies/headers/URLs.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskSummary=@()
foreach($taskTrace in Get-ChildItem -LiteralPath $TraceDirectory -Recurse -Filter trace.zip){
  $taskZip=[IO.Compression.ZipFile]::OpenRead($taskTrace.FullName)
  $taskCalls=@{};$taskLabels=@{};$taskAuth=@();$taskLogs=@()
  try {
    foreach($taskEntry in $taskZip.Entries){
      if($taskEntry.FullName -notmatch '\.(trace|network)$'){continue}
      $taskReader=[IO.StreamReader]::new($taskEntry.Open())
      try{$taskLines=$taskReader.ReadToEnd().Split("`n")}finally{$taskReader.Dispose()}
      foreach($taskLine in $taskLines){
        if(!$taskLine.Trim()){continue};$taskEvent=$taskLine|ConvertFrom-Json
        if($taskEntry.FullName -like '*.network'){
          $taskSnapshot=$taskEvent.snapshot
          $taskUrl=[Uri]$taskSnapshot.request.url
          if($taskUrl.Host -eq '127.0.0.1' -and $taskUrl.Port -eq 9099){
            $taskAuth+=@{path=$taskUrl.AbsolutePath;started=$taskSnapshot.startedDateTime;durationMs=$taskSnapshot.time;status=$taskSnapshot.response.status}
          };continue
        }
        $taskId=$taskEvent.callId
        if(!$taskId){continue}
        if(!$taskCalls.ContainsKey($taskId)){$taskCalls[$taskId]=@{id=$taskId}}
        $taskCall=$taskCalls[$taskId]
        if($taskEvent.type -eq 'before'){
          if($taskEntry.FullName -eq 'test.trace' -or !$taskCall.ContainsKey('start')){$taskCall.start=$taskEvent.startTime}
          if($taskEvent.params.selector -match 'Email me a sign-in link'){$taskLabels[$taskId]='email-link-button'}
          elseif($taskEvent.params.selector -match 'Sign out'){$taskLabels[$taskId]='sign-out-button'}
          elseif($taskEvent.method -eq 'reload'){$taskLabels[$taskId]='reload'}
          elseif($taskEvent.method -eq 'goto'){$taskLabels[$taskId]='goto-query-redacted'}
        }elseif($taskEvent.type -eq 'after'){
          if($taskEntry.FullName -eq 'test.trace' -or !$taskCall.ContainsKey('end')){$taskCall.end=$taskEvent.endTime}
          if($taskEvent.error.message -match 'page.reload:'){$taskLabels[$taskId]='reload';$taskCall.error='whole-test-timeout'}
          elseif($taskEvent.error.message -match 'NS_BINDING_ABORTED'){$taskCall.error='NS_BINDING_ABORTED'}
        }elseif($taskEvent.type -eq 'log' -and $taskEvent.callId -eq 'fcwl@56'){
          # Fixed original P14 call, no locator/request material in exported messages.
          $taskLogs+=@{time=$taskEvent.time;phase=if($taskEvent.message -match 'locator resolved'){'locator-resolved'}elseif($taskEvent.message -match 'click action done'){'click-done'}elseif($taskEvent.message -match 'waiting for getByRole'){'locator-wait-start'}else{'other-action-log'}}
        }
      }
    }
    $taskActions=@($taskLabels.GetEnumerator()|ForEach-Object{
      $taskCall=$taskCalls[$_.Key]
      @{id=$_.Key;label=$_.Value;startMs=$taskCall.start;endMs=$taskCall.end;durationMs=if($taskCall.ContainsKey('end')){[Math]::Round($taskCall.end-$taskCall.start,3)}else{$null};error=$taskCall.error}
    }|Sort-Object startMs)
    $taskSummary+=@{case=$taskTrace.Directory.Name;sha256=(Get-FileHash -LiteralPath $taskTrace.FullName -Algorithm SHA256).Hash;actions=$taskActions;authRequests=$taskAuth;emailClickPhases=$taskLogs}
  }finally{$taskZip.Dispose()}
}
$taskSummary|ConvertTo-Json -Depth 7|Set-Content -LiteralPath $Output
