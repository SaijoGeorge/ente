import "package:flutter/widgets.dart";
import "package:photos/models/file/file.dart";
import "package:photos/models/search/search_types.dart";

int kMostRelevantFilter = 10000;
int kLeastRelevantFilter = -1;

abstract class HierarchicalSearchFilter {
  //These matches should be from list of all files in db and not just all files
  //in gallery since this is used as cache for faster filtering when
  //adding/removing applied filters. An exception where results can be all files
  //in gallery is when the filter is the initial filter (top level) of the
  //gallery.
  final Set<int> matchedUploadedIDs;

  HierarchicalSearchFilter({matchedUploadedIDs})
      : matchedUploadedIDs = matchedUploadedIDs ?? {};

  String name();
  IconData? icon();

  /// Will be [kmostRelevantFilter] if the filter is a Top-levl filter. For
  /// example, when searching for an album 'A' and opening it, when
  /// hierarchical search starts, the album 'A' will be the top level filter.
  int relevance();
  bool isMatch(EnteFile file);
  Set<int> getMatchedUploadedIDs();
  bool isSameFilter(HierarchicalSearchFilter other);
  ResultType resultType();
}